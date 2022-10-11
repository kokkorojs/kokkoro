import { join } from 'path';
import { Client } from 'oicq';
import { EventEmitter } from 'events';
import { Logger, getLogger } from 'log4js';
import { MessagePort } from 'worker_threads';
import { Worker, MessageChannel, isMainThread, parentPort, WorkerOptions } from 'worker_threads';

import { logger } from '@/utils';
import { BotConfig } from '@/core';
import { getProfile } from '@/profile';
import { CHANGELOGS, UPDAY, VERSION } from '@/kokkoro';
import { Option, PluginInfo, retrievalPlugins } from '@/plugin';

interface BotApiEvent {
  method: keyof Client;
  params: unknown[];
}

interface BindBotEvent {
  uin: number;
  port: MessagePort;
}

interface BindPluginEvent {
  name: string;
  port: MessagePort;
}

interface BindListenEvent {
  name: string;
  listen: string;
}
interface BindSettingEvent {
  name: string;
  option: Option;
}

declare module 'worker_threads' {
  interface Worker extends EventEmitter {
    addListener(event: 'input.start', listener: () => void): this;

    emit(event: 'input.start'): boolean;

    on(event: 'input.start', listener: () => void): this;

    once(event: 'input.start', listener: () => void): this;

    prependListener(event: 'input.start', listener: () => void): this;

    prependOnceListener(event: 'input.start', listener: () => void): this;

    removeListener(event: 'input.start', listener: () => void): this;

    off(event: 'input.start', listener: () => void): this;
  }

  interface MessagePort extends EventEmitter {
    addListener(event: 'bot.api', listener: (event: BotApiEvent) => void): this;
    addListener(event: 'input.end', listener: (text: string) => void): this;
    addListener(event: 'bind.bot.port', listener: (event: BindBotEvent) => void): this;
    addListener(event: 'bind.plugin.port', listener: (event: BindPluginEvent) => void): this;
    addListener(event: 'bind.plugin.event', listener: (event: BindListenEvent) => void): this;
    addListener(event: 'bind.setting', listener: (event: BindSettingEvent) => void): this;

    emit(event: 'bot.api'): boolean;
    emit(event: 'input.end'): boolean;
    emit(event: 'bind.bot.port'): boolean;
    emit(event: 'bind.plugin.port'): boolean;
    emit(event: 'bind.plugin.event'): boolean;
    emit(event: 'bind.setting'): boolean;

    on(event: 'bot.api', listener: (event: BotApiEvent) => void): this;
    on(event: 'input.end', listener: (text: string) => void): this;
    on(event: 'bind.bot.port', listener: (event: BindBotEvent) => void): this;
    on(event: 'bind.plugin.port', listener: (event: BindPluginEvent) => void): this;
    on(event: 'bind.plugin.event', listener: (event: BindListenEvent) => void): this;
    on(event: 'bind.setting', listener: (event: BindSettingEvent) => void): this;

    once(event: 'bot.api', listener: (event: BotApiEvent) => void): this;
    once(event: 'input.end', listener: (text: string) => void): this;
    once(event: 'bind.bot.port', listener: (event: BindBotEvent) => void): this;
    once(event: 'bind.plugin.port', listener: (event: BindPluginEvent) => void): this;
    once(event: 'bind.plugin.event', listener: (event: BindListenEvent) => void): this;
    once(event: 'bind.setting', listener: (event: BindSettingEvent) => void): this;

    prependListener(event: 'bot.api', listener: (event: BotApiEvent) => void): this;
    prependListener(event: 'input.end', listener: (text: string) => void): this;
    prependListener(event: 'bind.bot.port', listener: (event: BindBotEvent) => void): this;
    prependListener(event: 'bind.plugin.port', listener: (event: BindPluginEvent) => void): this;
    prependListener(event: 'bind.plugin.event', listener: (event: BindListenEvent) => void): this;
    prependListener(event: 'bind.setting', listener: (event: BindSettingEvent) => void): this;

    prependOnceListener(event: 'bot.api', listener: (event: BotApiEvent) => void): this;
    prependOnceListener(event: 'input.end', listener: (text: string) => void): this;
    prependOnceListener(event: 'bind.bot.port', listener: (event: BindBotEvent) => void): this;
    prependOnceListener(event: 'bind.plugin.port', listener: (event: BindPluginEvent) => void): this;
    prependOnceListener(event: 'bind.plugin.event', listener: (event: BindListenEvent) => void): this;
    prependOnceListener(event: 'bind.setting', listener: (event: BindSettingEvent) => void): this;

    removeListener(event: 'bot.api', listener: (event: BotApiEvent) => void): this;
    removeListener(event: 'input.end', listener: (text: string) => void): this;
    removeListener(event: 'bind.bot.port', listener: (event: BindBotEvent) => void): this;
    removeListener(event: 'bind.plugin.port', listener: (event: BindPluginEvent) => void): this;
    removeListener(event: 'bind.plugin.event', listener: (event: BindListenEvent) => void): this;
    removeListener(event: 'bind.setting', listener: (event: BindSettingEvent) => void): this;

    off(event: 'bot.api', listener: (event: BotApiEvent) => void): this;
    off(event: 'input.end', listener: (text: string) => void): this;
    off(event: 'bind.bot.port', listener: (event: BindBotEvent) => void): this;
    off(event: 'bind.plugin.port', listener: (event: BindPluginEvent) => void): this;
    off(event: 'bind.plugin.event', listener: (event: BindListenEvent) => void): this;
    off(event: 'bind.setting', listener: (event: BindSettingEvent) => void): this;
  }
}

export interface ThreadMessage {
  name: string;
  event: {
    [key: string]: any;
  }
}

interface WorkerData {
  type: 'bot' | 'plugin';
  data: { uin?: number; config?: BotConfig; } | PluginInfo;
}

const bot_filename = join(__dirname, 'bot');
// bot 池
const botPool: Map<number, BotWorker> = new Map();
// 插件池
const pluginPool: Map<string, PluginWorker> = new Map();

class Thread extends Worker {
  logger: Logger;

  constructor(filename: string, options: WorkerOptions) {
    super(filename, options);

    const { workerData } = options;
    const { type, data } = <WorkerData>workerData;
    const category = `[${type}:${type === 'plugin' ? (<PluginInfo>data).name : (<any>data).uin}]`;

    this.logger = getLogger(category);
    // TODO ⎛⎝≥⏝⏝≤⎛⎝ 日志等级
    this.logger.level = 'all';

    this
      .once('online', () => {
        this.logger.debug(`线程已创建`);
      })
      .on('error', (error: Error) => {
        this.logger.error(error);
      })
      .on('message', (message: ThreadMessage) => {
        if (message.name) {
          this.emit(message.name, message.event);
        }
        this.logger.debug(`主线程收到消息:`, message);
      })
      .on('exit', (code: number) => {
        this.logger.debug(`线程已退出，代码:`, code);

        if (code) {
          this.logger.info('正在重启...');

          setTimeout(async () => {
            type === 'plugin'
              ? await rebindBotChannel(<PluginInfo>data)
              : await rebindPluginChannel((<any>data).uin, (<any>data).config);
          }, 3000);
        }
      })
      .on('input.start', terminalInput)
  }
}

class BotWorker extends Thread {
  constructor(uin: number, config?: BotConfig) {
    super(bot_filename, {
      workerData: <WorkerData>{
        type: 'bot',
        data: {
          uin, config
        }
      },
    });
    botPool.set(uin, this);
  }
}

class PluginWorker extends Thread {
  constructor(info: PluginInfo) {
    const { name, path } = info;

    super(path, {
      workerData: <WorkerData>{
        type: 'plugin',
        data: info,
      },
    });
    pluginPool.set(name, this);
  }
}

/**
 * 创建机器人线程实例
 *
 * @param uin - qq 账号
 * @param config - 机器人配置项
 * @returns 机器人线程实例
 */
function createBotWorker(uin: number, config?: BotConfig) {
  return new BotWorker(uin, config);
}

/**
 * 创建插件线程实例
 *
 * @param info - 插件信息
 * @returns 插件线程实例
 */
function createPluginWorker(info: PluginInfo) {
  return new PluginWorker(info);
}

/**
 * 创建机器人多线程服务
 */
function createBotThreads() {
  const bots = getProfile('bots');
  const uins = Object.keys(bots).map(Number);

  if (uins.length > 1) {
    throw new Error('v1.0 暂不支持多账号登录，如有使用需求可回滚 v0.3');
  }
  const uins_length = uins.length;

  for (let i = 0; i < uins_length; i++) {
    const uin: number = uins[i];
    const config: BotConfig = bots[uin];

    createBotWorker(uin, config);
  }
}

/**
 * 创建插件多线程服务
 */
async function createPluginThreads() {
  const plugins = await retrievalPlugins();
  const extension: PluginInfo = {
    name: 'kokkoro',
    path: join(__dirname, 'plugin/extension'),
    local: true,
  };

  [extension, ...plugins].forEach((info) => {
    createPluginWorker(info);
  });
}

/**
 * 重新绑定 bot 信道
 * 
 * @param info 
 */
async function rebindBotChannel(info: PluginInfo) {
  createPluginWorker(info);
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
async function rebindPluginChannel(uin: number, config: BotConfig) {
  createBotWorker(uin, config);
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
  const { port1: botPort, port2: pluginPort } = new MessageChannel();
  const bot_worker = botPool.get(uin)!;
  const plugin_worker = pluginPool.get(name)!;

  const bindPluginEvent = {
    name: 'bind.plugin.port',
    event: { name, port: pluginPort },
  };
  const bindBotEvent = {
    name: 'bind.bot.port',
    event: { uin, port: botPort },
  };

  bot_worker.postMessage(bindPluginEvent, [pluginPort]);
  plugin_worker.postMessage(bindBotEvent, [botPort]);
}

/**
 * 代理主线程通信
 */
export function proxyParentPort() {
  if (isMainThread) {
    throw new Error('当前已在主线程');
  }
  parentPort!.on('message', (message: ThreadMessage) => {
    if (message.name) {
      parentPort!.emit(message.name, message.event);
    }
  });
}

/**
 * 监听控制台输入
 * 
 * @param this - 机器人线程实例
 */
function terminalInput(this: BotWorker, write?: string) {
  logger.info('检测到 input.start 事件，已停止 log 打印');
  logger.level = 'off';

  write && process.stdout.write(write);
  process.stdin.once('data', (event) => {
    this.postMessage({
      name: 'input.end', event: event.toString().trim(),
    });

    logger.level = 'all';
    logger.info('输入完毕，启用 log 打印');
  });
}
