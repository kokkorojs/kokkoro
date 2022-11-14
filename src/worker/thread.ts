import { join } from 'path';
import { Logger, getLogger } from 'log4js';
import { TransferListItem, Worker, WorkerOptions } from 'worker_threads';

import { logger } from '@/utils';
import { BotConfig } from '@/core';
import { getConfig } from '@/config';
import { ThreadEventMap } from '@/events';
import { CHANGELOGS, UPDAY, VERSION } from '@/kokkoro';
import { PluginInfo, retrievalPlugins } from '@/plugin';

/** bot api 事件 */
// interface BotApiEvent {
//   method: keyof Client;
//   params: unknown[];
// }

export interface BotWorkerData {
  uin: number;
  config?: BotConfig;
}

// export interface PluginWorkerData extends PluginInfo {

// }

/** 线程消息 */
export interface ThreadMessage {
  name?: keyof ThreadEventMap;
  event: any;
}

interface ThreadOptions extends WorkerOptions {
  // workerData: WorkerData;
  type: 'bot' | 'plugin',
}

// export interface BotMessagePort extends MessagePort {
//   // TODO ⎛⎝≥⏝⏝≤⎛⎝
//   // on(event: 'bot.port.message', listener: (message: ThreadMessage) => void): this;
// }

// export interface PluginMessagePort extends MessagePort {
//   // TODO ⎛⎝≥⏝⏝≤⎛⎝
//   // on(event: 'plugin.port.message', listener: (message: ThreadMessage) => void): this;
// }

// export interface BotLinkChannelEvent {
//   name: string;
//   port: PluginMessagePort;
// }

// export interface PluginLinkChannelEvent {
//   uin: number;
//   port: BotMessagePort;
// }

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

export interface BroadcastLinkEvent {
  uin: number;
};

// export type ThreadPostMessage =
//   {
//     name: 'plugin.broadcast.link';
//     event: BroadcastLinkEvent;
//   }
// |
// //   {
// //     name: 'bot.link.channel';
// //     event: BotLinkChannelEvent;
// //   } |
// //   {
// //     name: 'plugin.link.channel';
// //     event: PluginLinkChannelEvent;
// //   } |
// //   {
// //     name: 'bot.plugin.disable';
// //     event: string;
// //   } |
// //   {
// //     name: string;
// //     event: any;
// //   }

/** 事件接口 */
export interface Thread extends Worker {
  // postMessage(message: ThreadMessage, transferList?: ReadonlyArray<TransferListItem>): void;

  addListener<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
  emit<T extends keyof ThreadEventMap>(event: T, ...args: Parameters<ThreadEventMap<this>[T]>): boolean;
  on<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
  once<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
  prependListener<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
  prependOnceListener<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
  removeListener<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
  off<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
}

const bot_filename = join(__dirname, 'bot');
// bot 池
const botPool: Map<number, BotThread> = new Map();
// 插件池
const pluginPool: Map<string, PluginThread> = new Map();

export class Thread extends Worker {
  logger: Logger;

  constructor(
    /** 文件路径 */
    filename: string,
    /** 配置项 */
    private options: ThreadOptions,
  ) {
    super(filename, options);
    const { workerData, type } = options;

    switch (type) {
      case 'bot':
        this.logger = getLogger(`[bot:${workerData.uin}]`);
        break;
      case 'plugin':
        this.logger = getLogger(`[plugin:${workerData.name}]`);
        break;
    }
    // TODO ⎛⎝≥⏝⏝≤⎛⎝ 日志等级
    this.logger.level = 'all';

    this.initEvents();
    this.bindEvents();
  }

  private initEvents() {
    this.on('exit', (exitCode) => this.emit('thread.exit', exitCode));
    this.on('error', (err) => this.emit('thread.error', err));
    this.on('online', () => this.emit('thread.online'));
    this.on('message', (value) => this.emit('thread.message', value));
    this.on('messageerror', (error) => this.emit('thread.messageerror', error));
  }

  private bindEvents() {
    this.on('thread.exit', this.onExit);
    this.on('thread.error', this.onError);
    this.on('thread.online', this.onOnline);
    this.on('thread.message', this.onMessage);
    this.on('thread.messageerror', this.onMessageError);
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
    this.logger.debug(`线程已退出，状态码: ${code}`);

    if (code) {
      this.logger.info('正在重启...');

      setTimeout(async () => {
        const { workerData, type } = this.options;

        switch (type) {
          case 'bot':
            createBotThread(workerData.uin, workerData.config);
            break;

          case 'plugin':
            createPluginThread(workerData);
            break;
        }
      }, 1000);
    }
  }

  private onMessage(message: ThreadMessage) {
    if (message.name) {
      this.emit(message.name, message.event);
    }
    this.logger.debug(message);
  }

  private onMessageError(error: Error) {
    this.logger.error('反序列化消息失败:', error.message);
  }

  private onInput(this: Thread, prefix?: string) {
    prefix && process.stdout.write(prefix);
    process.stdin.once('data', (event) => {
      this.postMessage({
        name: 'thread.process.stdout',
        content: event.toString().trim(),
      });
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
        const pluginThread = createPluginThread(info);
        const message = {
          name: 'plugin.channel.link',
          event: uin,
        };

        pluginThread.postMessage(message);
      } catch (err) {
        error = (<Error>err).message;
      }
    }
    const botThread = botPool.get(uin)!;

    botThread.postMessage({
      name: `bot.task.${id}`,
      event: error,
    });
  }

  private async onPluginUnmount(event: PluginUnmountEvent) {
    let error;

    const { id, name, uin } = event;

    if (!pluginPool.has(name)) {
      error = `插件 ${name} 未挂载`;
    } else {
      const pluginThread = pluginPool.get(name)!;

      pluginThread.postMessage({
        name: `plugin.destroy`,
        event: 0,
      });
      pluginPool.delete(name);
    }
    const botThread = botPool.get(uin)!;

    botThread.postMessage({
      name: `bot.task.${id}`,
      event: error,
    });
  }

  private async onPluginReload(event: PluginUnmountEvent) {
    let error;

    const { id, name, uin } = event;

    if (!pluginPool.has(name)) {
      error = `插件 ${name} 未挂载`;
    } else {
      const pluginThread = pluginPool.get(name)!;

      pluginThread.postMessage({
        name: `plugin.destroy`,
        event: 1,
      });
    }
    const botThread = botPool.get(uin)!;

    botThread.postMessage({
      name: `bot.task.${id}`,
      event: error,
    });
  }
}

class BotThread extends Thread {
  constructor(uin: number, config?: BotConfig) {
    const options: ThreadOptions = {
      type: 'bot',
      workerData: {
        uin, config,
      },
    };

    super(bot_filename, options);
    botPool.set(uin, this);

    this.on('thread.broadcast.link', () => {
      pluginPool.forEach((thread) => {
        const message = {
          name: 'plugin.broadcast.link',
          event: {
            uin,
          },
        };

        thread.postMessage(message);
      });
    });
  }
}

class PluginThread extends Thread {
  constructor(info: PluginInfo) {
    const options: ThreadOptions = {
      type: 'plugin',
      workerData: info,
    };

    super(info.path, options);
    pluginPool.set(info.name, this);

    this.on('thread.plugin.created', () => {
      botPool.forEach((thread, uin) => {
        const message = {
          name: 'bot.broadcast.link',
          event: {
            uin,
          },
        };

        thread.postMessage(message);
      });
    });
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
  const uins_length = uins.length;

  // TODO ⎛⎝≥⏝⏝≤⎛⎝ v2 将会开发 web 后台统一管理账号
  if (uins_length > 1) {
    throw new Error('v1 暂不支持多账号登录，若要在终端并发登录可自行 fork 修改源码');
  }
  for (let i = 0; i < uins_length; i++) {
    const uin = uins[i];
    const config = bots[uin];
    const botThread = createBotThread(uin, config);

    botThread.once('thread.bot.created', () => {
      botThread.logger.info(`已创建 bot(${uin}) 线程`);
    });
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
    path: join(__dirname, '../plugin/extension.js'),
    local: true,
  };
  const infos = [extension, ...plugins];
  const infos_length = infos.length;
  const threadQueue = [];

  for (let i = 0; i < infos_length; i++) {
    const info = infos[i];
    const pluginThread = createPluginThread(info);
    const task = await new Promise<void>((resolve) => {
      pluginThread.once('thread.plugin.created', () => {
        pluginThread.logger.info(`已创建 ${info.name} 线程`);
        resolve();
      });
    });

    threadQueue.push(task);
  }

  await Promise.allSettled(threadQueue);
}

export async function setup() {
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
    await createPluginThreads();
    createBotThreads();
  } catch (error) {
    throw error;
  }
}
