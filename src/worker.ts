import { join } from 'path';
import { Client } from 'oicq';
import { EventEmitter } from 'events';
import { Logger, getLogger } from 'log4js';
import { Worker, MessageChannel, isMainThread, parentPort, WorkerOptions, MessagePort } from 'worker_threads';

import { logger } from '@/utils';
import { BotConfig } from '@/core/bot';
import { getProfile } from '@/profile';
import { CHANGELOGS, UPDAY, VERSION } from '.';
import { PluginInfo, retrievalPlugins } from '@/plugin';

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

export interface ThreadMessage {
  name: string;
  event: {
    [key: string]: any;
  }
}

/** worker_threads 扩展 */
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
    addListener(event: 'bind.plugin.listen', listener: (event: BindListenEvent) => void): this;

    emit(event: 'bot.api'): boolean;
    emit(event: 'input.end'): boolean;
    emit(event: 'bind.bot.port'): boolean;
    emit(event: 'bind.plugin.port'): boolean;
    emit(event: 'bind.plugin.listen'): boolean;

    on(event: 'bot.api', listener: (event: BotApiEvent) => void): this;
    on(event: 'input.end', listener: (text: string) => void): this;
    on(event: 'bind.bot.port', listener: (event: BindBotEvent) => void): this;
    on(event: 'bind.plugin.port', listener: (event: BindPluginEvent) => void): this;
    on(event: 'bind.plugin.listen', listener: (event: BindListenEvent) => void): this;

    once(event: 'bot.api', listener: (event: BotApiEvent) => void): this;
    once(event: 'input.end', listener: (text: string) => void): this;
    once(event: 'bind.bot.port', listener: (event: BindBotEvent) => void): this;
    once(event: 'bind.plugin.port', listener: (event: BindPluginEvent) => void): this;
    once(event: 'bind.plugin.listen', listener: (event: BindListenEvent) => void): this;

    prependListener(event: 'bot.api', listener: (event: BotApiEvent) => void): this;
    prependListener(event: 'input.end', listener: (text: string) => void): this;
    prependListener(event: 'bind.bot.port', listener: (event: BindBotEvent) => void): this;
    prependListener(event: 'bind.plugin.port', listener: (event: BindPluginEvent) => void): this;
    prependListener(event: 'bind.plugin.listen', listener: (event: BindListenEvent) => void): this;

    prependOnceListener(event: 'bot.api', listener: (event: BotApiEvent) => void): this;
    prependOnceListener(event: 'input.end', listener: (text: string) => void): this;
    prependOnceListener(event: 'bind.bot.port', listener: (event: BindBotEvent) => void): this;
    prependOnceListener(event: 'bind.plugin.port', listener: (event: BindPluginEvent) => void): this;
    prependOnceListener(event: 'bind.plugin.listen', listener: (event: BindListenEvent) => void): this;

    removeListener(event: 'bot.api', listener: (event: BotApiEvent) => void): this;
    removeListener(event: 'input.end', listener: (text: string) => void): this;
    removeListener(event: 'bind.bot.port', listener: (event: BindBotEvent) => void): this;
    removeListener(event: 'bind.plugin.port', listener: (event: BindPluginEvent) => void): this;
    removeListener(event: 'bind.plugin.listen', listener: (event: BindListenEvent) => void): this;

    off(event: 'bot.api', listener: (event: BotApiEvent) => void): this;
    off(event: 'input.end', listener: (text: string) => void): this;
    off(event: 'bind.bot.port', listener: (event: BindBotEvent) => void): this;
    off(event: 'bind.plugin.port', listener: (event: BindPluginEvent) => void): this;
    off(event: 'bind.plugin.listen', listener: (event: BindListenEvent) => void): this;
  }
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
    const { uin, config, info } = workerData;
    const category = `[worker:${info ? info.name : uin}]`;

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
          const is_plugin = !!info;

          setTimeout(async () => {
            is_plugin
              ? await rebindBotChannel(info)
              : await rebindPluginChannel(uin, config);
          }, 3000);
        }
      })
      .on('input.start', terminalInput)
  }
}

class BotWorker extends Thread {
  constructor(uin: number, config?: BotConfig) {
    super(bot_filename, {
      workerData: { uin, config },
    });
    botPool.set(uin, this);
  }
}

class PluginWorker extends Thread {
  constructor(info: PluginInfo) {
    const { name, path } = info;

    super(path, {
      workerData: { info },
    });
    pluginPool.set(name, this);
  }
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
 * 创建机器人线程实例
 *
 * @param uin
 * @param config
 */
function createBotWorker(uin: number, config?: BotConfig) {
  return new BotWorker(uin, config);
}

/**
 * 创建插件线程实例
 *
 * @param info
 * @returns
 */
function createPluginWorker(info: PluginInfo) {
  return new PluginWorker(info);
}

/**
 * 创建机器人多线程服务
 */
function createBotThreads() {
  const bots = getProfile('bots');
  const map = new Map(Object.entries(bots));

  if (map.size > 1) {
    throw new Error('v1.0 暂不支持多账号登录，如有使用需求可回滚 v0.3');
  }

  map.forEach((config, uin) => {
    createBotWorker(+uin, config);
  });
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
  const botPortEvent = {
    name: 'bind.plugin.port',
    event: { name, port: pluginPort },
  };
  const pluginPortEvent = {
    name: 'bind.bot.port',
    event: { uin, port: botPort },
  };

  bot_worker.postMessage(botPortEvent, [pluginPort]);
  plugin_worker.postMessage(pluginPortEvent, [botPort]);
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

function terminalInput(this: BotWorker) {
  logger.info('检测到 input.start 事件，已停止 log 打印');
  logger.level = 'off'

  process.stdin.once('data', (event) => {
    this.postMessage({
      name: 'input.end', event: event.toString().trim(),
    });

    logger.level = 'all';
    logger.info('输入完毕，启用 log 打印');
  });
}
