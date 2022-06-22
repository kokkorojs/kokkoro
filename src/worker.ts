import { join } from 'path';
import { logger } from '@kokkoro/utils';
import { Worker, MessageChannel, isMainThread, parentPort } from 'worker_threads';

import { Config } from './bot';
import { getGlobalConfig } from './config';
import { PluginInfo, retrievalPlugin } from './plugin';

const bot_workers: Map<number, BotWorker> = new Map();
const plugin_workers: Map<string, PluginWorker> = new Map();

// 主线程事件
type MainThreadEvent = {
  name: string;
  event: {};
};

class BotWorker extends Worker {
  constructor(uin: number, config: Config) {
    const bot_path = join(__dirname, 'bot');

    super(bot_path, {
      workerData: { uin, config },
    });
    bot_workers.set(uin, this);

    this
      .once('online', () => {
        logger.debug(`bot(${uin}) 线程已创建`);
      })
      .on('error', (error) => {
        logger.error(error.message);
      })
      .on('message', (event) => {
        console.log(`主线程收到 bot 消息`, event);
      })
      .on('exit', (code) => {
        logger.debug(`bot(${uin}) 线程已退出，代码:`, code)

        if (code) {
          logger.info('正在重启...');

          setTimeout(() => {
            createBotWorker(uin, config);
          }, 3000);
        }
      })
  }
}

class PluginWorker extends Worker {
  constructor(info: PluginInfo) {
    const { name, path } = info;

    super(path);
    plugin_workers.set(name, this);

    this
      .once('online', () => {
        logger.debug(`插件 "${name}" 线程已创建`);
      })
      .on('error', (error) => {
        logger.error(error.message);
      })
      .on('message', (event) => {
        console.log(`主线程收到 plugin 消息`, event);
      })
      .on('exit', (code) => {
        logger.debug(`插件 "${name}" 线程已退出，代码:`, code);

        if (code) {
          logger.info('正在重启...');

          setTimeout(() => {
            createPluginWorker(info);
          }, 3000);
        }
      })
  }
}

/**
 * 创建机器人线程实例
 * 
 * @param uin 
 * @returns 
 */
function createBotWorker(uin: number, config: Config) {
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
  const bots = getGlobalConfig('bots');
  const map = new Map(Object.entries(bots));

  // 未来将不在支持终端账号登录，统一在 web 端管理
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

  [...modules, ...plugins].forEach((info) => {
    createPluginWorker(info);
  })
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
    return;
  }

  // 建立线程通信
  bot_workers.forEach((bot_worker) => {
    const plugin_list = ['demo'];

    plugin_list.forEach((name) => {
      const { port1: botPort, port2: pluginPort } = new MessageChannel();
      const botPortEvent = {
        name: 'bind.port',
        event: { name, port: pluginPort },
      };
      bot_worker.postMessage(botPortEvent, [pluginPort]);

      const plugin_worker = plugin_workers.get(name)!;
      const pluginPortEvent = {
        name: 'bind.port',
        event: { port: botPort },
      };
      plugin_worker.postMessage(pluginPortEvent, [botPort]);
    });
  });
}

// 代理主线程通信
export function proxyParentPort() {
  if (isMainThread) {
    throw new Error('当前已在主线程');
  }
  // 事件转发
  parentPort!.on('message', (message: MainThreadEvent) => {
    if (message.name) {
      emitParentPort(message.name, message.event);
    }
  });
}

export function emitParentPort(name: string, event: object) {
  if (isMainThread) {
    throw new Error('当前已在主线程');
  }
  parentPort!.emit(name, event);
}
