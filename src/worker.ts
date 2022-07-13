import { join } from 'path';
import log4js, { Logger } from 'log4js';
import { logger } from '@kokkoro/utils';
import { Worker, MessageChannel, isMainThread, parentPort, WorkerOptions } from 'worker_threads';

import { BotWorkerData, Config } from './bot';
import { getProfile } from './profile';
import { getPluginList, PluginInfo, retrievalPlugin } from './plugin';

const bot_filename = join(__dirname, 'bot');
const bot_pool: Map<number, BotWorker> = new Map();
const plugin_pool: Map<string, PluginWorker> = new Map();

class WorkerThread extends Worker {
  logger: Logger;

  constructor(filename: string, options: WorkerOptions) {
    super(filename, options);

    const { workerData } = options;
    const { uin, config, info } = workerData;
    const category = `[worker:${uin ? uin : info.name}]`;

    this.logger = log4js.getLogger(category);
    this.logger.level = 'all' ?? 'info';

    this
      .once('online', () => {
        this.logger.debug(`线程已创建`);
      })
      .on('error', (error) => {
        this.logger.error(error);
      })
      .on('message', (value) => {
        this.logger.debug(`主线程收到消息:`, value);
      })
      .on('exit', (code) => {
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
  }
}

class BotWorker extends WorkerThread {
  constructor(uin: number, config?: Config) {
    super(bot_filename, {
      workerData: { uin, config } as BotWorkerData,
    });
    bot_pool.set(uin, this);
  }
}

class PluginWorker extends WorkerThread {
  constructor(info: PluginInfo) {
    const { name, path } = info;

    super(path, {
      workerData: { info },
    });
    plugin_pool.set(name, this);
  }
}

/**
 * 重新绑定 bot 信道
 * 
 * @param info 
 */
async function rebindBotChannel(info: PluginInfo) {
  createPluginWorker(info);
  const bot_keys = [...bot_pool.keys()];

  bot_keys.forEach((uin) => {
    linkMessageChannel(uin, info.name);
  });
}

/**
 * 重新绑定插件信道
 * 
 * @param uin 
 * @param config 
 */
async function rebindPluginChannel(uin: number, config: Config) {
  createBotWorker(uin, config);
  const plugin_list = await getPluginList();

  ['kokkoro', ...plugin_list].forEach((name) => {
    linkMessageChannel(uin, name);
  });
}

/**
 * 创建机器人线程实例
 *
 * @param uin
 * @param config
 */
function createBotWorker(uin: number, config?: Config) {
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
    throw new Error('v0.4 暂不支持多账号登录，如有使用需求可回滚 v0.3');
  }

  map.forEach((config, uin) => {
    createBotWorker(+uin, config);
  });
}

/**
 * 创建插件多线程服务
 */
async function createPluginThreads() {
  const { modules, plugins } = await retrievalPlugin();
  const extension: PluginInfo = {
    name: 'kokkoro',
    path: join(__dirname, 'plugin/extension'),
  };
  [extension, ...modules, ...plugins].forEach((info) => {
    createPluginWorker(info);
  });
}

/**
 * 润
 */
export async function runWorkerThreads() {
  try {
    createBotThreads();
    await createPluginThreads();
  } catch (error) {
    logger.error((error as Error).message);
    logger.warn('未来将不再支持终端账号登录，统一在 web 端管理');
    return;
  }
  const bot_keys = [...bot_pool.keys()];
  const plugin_list = await getPluginList();

  bot_keys.forEach((uin) => {
    plugin_list.forEach((name) => {
      linkMessageChannel(uin, name);
    });
  });
}

/**
 * 建立双向通信通道
 *
 * @param uin bot 账号
 * @param name 插件名称
 */
function linkMessageChannel(uin: number, name: string): void {
  if (!bot_pool.has(uin) || !plugin_pool.has(name)) {
    throw new Error('thread is not defined');
  }
  const { port1: botPort, port2: pluginPort } = new MessageChannel();
  const bot_worker = bot_pool.get(uin)!;
  const plugin_worker = plugin_pool.get(name)!;
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

// 代理主线程通信
export function proxyParentPort() {
  if (isMainThread) {
    throw new Error('当前已在主线程');
  }
  // 事件转发
  parentPort!.on('message', (message: any) => {
    console.log('转发消息', message.name);
    if (message.name) {
      parentPort!.emit(message.name, message.event);
    }
  });
}
