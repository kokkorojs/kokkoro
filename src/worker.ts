import { join } from 'path';
import { Logger, getLogger } from 'log4js';
import { Worker, MessageChannel, WorkerOptions, MessagePort, TransferListItem } from 'worker_threads';

import { logger } from '@/utils';
import { BotConfig } from '@/core';
import { getConfig } from '@/config';
import { ThreadEventMap } from '@/events';
import { CHANGELOGS, UPDAY, VERSION } from '@/kokkoro';
import { PluginSetting, PluginInfo, retrievalPlugins } from '@/plugin';

/** bot api 事件 */
// interface BotApiEvent {
//   method: keyof Client;
//   params: unknown[];
// }

interface BotWorkerData {
  type: 'bot';
  uin: number;
  config?: BotConfig;
}

interface PluginWorkerData extends PluginInfo {
  type: 'plugin';
}

type WorkerData = BotWorkerData | PluginWorkerData;

interface ThreadOptions extends WorkerOptions {
  workerData: WorkerData;
}

/** 线程消息 */
export interface ThreadMessage {
  name: keyof ThreadEventMap;
  event: any;
}

export interface BotMessagePort extends MessagePort {
  // TODO ⎛⎝≥⏝⏝≤⎛⎝
  // on(event: 'bot.port.message', listener: (message: ThreadMessage) => void): this;
}

export interface PluginMessagePort extends MessagePort {
  // TODO ⎛⎝≥⏝⏝≤⎛⎝
  // on(event: 'plugin.port.message', listener: (message: ThreadMessage) => void): this;
}

export interface BotLinkChannelEvent {
  name: string;
  port: PluginMessagePort;
}

export interface PluginLinkChannelEvent {
  uin: number;
  port: BotMessagePort;
}

export interface PluginMountEvent {
  id: string;
  info: PluginInfo;
  uin: number;
}
export interface PluginUnmountEvent {
  id: string;
  name: string;
  uin: number;
}

export type ThreadPostMessage =
  {
    name: 'thread.process.stdout';
    content: string;
  } |
  {
    name: 'bot.link.channel';
    event: BotLinkChannelEvent;
  } |
  {
    name: 'plugin.link.channel';
    event: PluginLinkChannelEvent;
  } |
  {
    name: 'bot.plugin.disable';
    event: string;
  } |
  {
    name: string;
    event: any;
  }

/** 事件接口 */
export interface Thread extends Worker {
  postMessage(message: ThreadPostMessage, transferList?: ReadonlyArray<TransferListItem>): void;

  addListener<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
  emit<T extends keyof ThreadEventMap>(event: T, ...args: Parameters<ThreadEventMap<this>[T]>): boolean;
  on<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this
  once<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this
  prependListener<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this
  prependOnceListener<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this
  removeListener<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this
  off<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this
}

const bot_filename = join(__dirname, 'bot');
// bot 池
const botPool: Map<number, BotThread> = new Map();
// 插件池
const pluginPool: Map<string, PluginThread> = new Map();

export class Thread extends Worker {
  /** 日志 */
  logger: Logger;

  constructor(
    private filename: string,
    private options: ThreadOptions,
  ) {
    super(filename, options);

    const workerData = options.workerData;
    const category = `[${workerData.type}:${workerData.type === 'plugin' ? workerData.name : workerData.uin}]`;

    this.logger = getLogger(category);
    // TODO ⎛⎝≥⏝⏝≤⎛⎝ 日志等级
    this.logger.level = 'all';

    this.initEvents();
    this.bindEvents();
  }

  private initEvents() {
    this.on('error', (err) => {
      this.emit('thread.error', err);
    });
    this.on('exit', (exitCode) => {
      this.emit('thread.exit', exitCode);
    });
    this.on('message', (value) => {
      this.emit('thread.message', value);
    });
    this.on('messageerror', (error) => {
      this.emit('thread.messageerror', error);
    });
    this.on('online', () => {
      this.emit('thread.online');
    })
  }

  private bindEvents() {
    this.on('thread.error', this.onError);
    this.on('thread.exit', this.onExit);
    this.on('thread.message', this.onMessage);
    this.on('thread.messageerror', this.onMessageError);
    this.on('thread.online', this.onOnline);
    this.on('thread.process.stdin', this.onInput);
    this.on('thread.plugin.mount', this.onPluginMount);
    this.on('thread.plugin.unmount', this.onPluginUnmount);
    this.on('thread.plugin.reload', this.onPluginReload);
  }

  private onOnline() {
    this.logger.debug(`线程已创建，开始执行代码`);
  }

  private onError(error: Error) {
    this.logger.error(error);
  }

  private onExit(code: number) {
    this.logger.debug(`线程已退出，代码:`, code);

    if (code) {
      this.logger.info('正在重启...');

      setTimeout(async () => {
        const workerData = this.options.workerData;

        workerData.type === 'plugin'
          ? await rebindBotChannel(workerData)
          : await rebindPluginChannel(workerData.uin, workerData.config);
      }, 3000);
    }
  }

  private onMessage(message: ThreadMessage) {
    if (!message.name) {
      throw new Error('message error');
    }
    this.emit(message.name, message.event);
    this.logger.debug(`主线程收到消息:`, message);
  }

  private onMessageError(error: Error) {
    this.logger.error('反序列化消息失败:', error.message);
  }

  private onInput(prefix?: string) {
    logger.info('监听到 thread.process.stdin 事件，已停止 log 打印');
    logger.level = 'off';

    prefix && process.stdout.write(prefix);
    process.stdin.once('data', (event) => {
      this.postMessage({
        name: 'thread.process.stdout',
        content: event.toString().trim(),
      });

      logger.level = 'all';
      logger.info('输入完毕，启用 log 打印');
    });
  }

  private async onPluginMount(event: PluginMountEvent) {
    let error;

    const { id, info, uin } = event;
    const { name } = info;

    if (pluginPool.has(name)) {
      error = `插件 ${name} 已被挂载`;
    } else {
      try {
        await rebindBotChannel(info);
      } catch (e) {
        if (e instanceof Error) error = e.message;
      }
    }
    const thread = botPool.get(uin)!;

    thread.postMessage({
      name: `thread.task.${id}`,
      event: error,
    });
  }

  private async onPluginUnmount(event: PluginUnmountEvent) {
    let error;

    const { id, name, uin } = event;

    if (!pluginPool.has(name)) {
      error = `插件 ${name} 未挂载`;
    } else {
      const thread = pluginPool.get(name)!;

      thread.postMessage({
        name: `plugin.destroy`,
        event: 0,
      });
    }
    const thread = botPool.get(uin)!;

    thread.postMessage({
      name: `thread.task.${id}`,
      event: error,
    });
  }

  private async onPluginReload(event: PluginUnmountEvent) {
    let error;

    const { id, name, uin } = event;

    if (!pluginPool.has(name)) {
      error = `插件 ${name} 未挂载`;
    } else {
      const thread = pluginPool.get(name)!;

      thread.postMessage({
        name: `plugin.destroy`,
        event: 1,
      });
    }
    const thread = botPool.get(uin)!;

    thread.postMessage({
      name: `thread.task.${id}`,
      event: error,
    });
  }
}

class BotThread extends Thread {
  constructor(uin: number, config?: BotConfig) {
    const options: ThreadOptions = {
      workerData: {
        type: 'bot', uin, config,
      }
    }

    super(bot_filename, options);
    botPool.set(uin, this);
  }
}

class PluginThread extends Thread {
  constructor(info: PluginInfo) {
    const { name, path } = info;
    const options: ThreadOptions = {
      workerData: {
        type: 'plugin', ...info,
      }
    }

    super(path, options);
    pluginPool.set(name, this);
  }
}

/**
 * 创建机器人线程
 *
 * @param uin - qq 账号
 * @param config - 机器人配置项
 * @returns 机器人线程实例
 */
function createBotThread(uin: number, config?: BotConfig) {
  return new BotThread(uin, config);
}

/**
 * 创建插件线程
 *
 * @param info - 插件信息
 * @returns 插件线程实例
 */
function createPluginThread(info: PluginInfo) {
  return new PluginThread(info);
}

/**
 * 创建机器人多线程服务
 */
function createBotThreads() {
  const bots = getConfig('bots');
  const uins = Object.keys(bots).map(Number);

  if (uins.length > 1) {
    throw new Error('v1.0 暂不支持多账号登录，如有使用需求可回滚 v0.3');
  }
  const uins_length = uins.length;

  for (let i = 0; i < uins_length; i++) {
    const uin: number = uins[i];
    const config: BotConfig = bots[uin];

    createBotThread(uin, config);
  }
}

/**
 * 创建插件多线程服务
 */
async function createPluginThreads() {
  const plugins = await retrievalPlugins();
  const extension: PluginInfo = {
    name: 'kokkoro',
    folder: 'core',
    path: join(__dirname, 'plugin/extension.js'),
    local: true,
  };

  [extension, ...plugins].forEach((info) => {
    createPluginThread(info);
  });
}

/**
 * 重新绑定 bot 信道
 * 
 * @param info 
 */
async function rebindBotChannel(info: PluginInfo) {
  createPluginThread(info);
  const unis = [...botPool.keys()];

  unis.forEach((uin: number) => {
    linkMessageChannel(uin, info.name);
  });
}

/**
 * 重新绑定插件信道
 * 
 * @param uin 
 * @param config 
 */
async function rebindPluginChannel(uin: number, config?: BotConfig) {
  createBotThread(uin, config);
  const plugins = [...pluginPool.keys()];

  plugins.forEach((name: string) => {
    linkMessageChannel(uin, name);
  });
}

/**
 * 润
 */
export async function runWorkerThreads() {
  const logo = `
    |   _  |  |   _  ._ _    ._ _   _. o o   _|_  _  ._  ._   _ |_  o   |
    |< (_) |< |< (_) | (_)   | | | (_| | |    |_ (/_ | | | |  > | | |   |
                                      ╯                                o
  `;
  process.title = 'kokkoro';
  console.log(`\u001b[32m${logo}\u001b[0m`);

  logger.mark(`----------`);
  logger.mark(`Package Version: kokkoro@${VERSION} (Released on ${UPDAY})`);
  logger.mark(`View Changelogs: ${CHANGELOGS}`);
  logger.mark(`----------`);

  try {
    createBotThreads();
    await createPluginThreads();
  } catch (error) {
    throw error;
  }
  const unis = [...botPool.keys()];
  const plugins = [...pluginPool.keys()];

  unis.forEach((uin) => {
    plugins.forEach((name) => {
      linkMessageChannel(uin, name);
    });
  });
}

/**
 * 建立双向通信通道
 *
 * @param uin - bot 账号
 * @param name - 插件名称
 */
function linkMessageChannel(uin: number, name: string): void {
  if (!botPool.has(uin) || !pluginPool.has(name)) {
    throw new Error('thread is not defined');
  }
  const { port1: botMessagePort, port2: pluginMessagePort } = new MessageChannel();

  const botThread = botPool.get(uin)!;
  const pluginThread = pluginPool.get(name)!;

  const botLinkChannelEvent: ThreadPostMessage = {
    name: 'bot.link.channel',
    event: { name, port: pluginMessagePort },
  };
  const pluginLinkChannelEvent: ThreadPostMessage = {
    name: 'plugin.link.channel',
    event: { uin, port: botMessagePort },
  };

  botThread.postMessage(botLinkChannelEvent, [pluginMessagePort]);
  pluginThread.postMessage(pluginLinkChannelEvent, [botMessagePort]);
}
