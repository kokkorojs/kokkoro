import { logger } from '@kokkoro/utils';
import { join } from 'path';
import { Worker, MessageChannel } from 'worker_threads';

import { Config } from './bot';
import { getGlobalConfig } from './config';
import { PluginInfo, retrievalPlugin } from './plugin';

const bot_workers: Map<number, BotWorker> = new Map();
const plugin_workers: Map<string, PluginWorker> = new Map();

class BotWorker extends Worker {
  constructor(uin: number, config: Config) {
    const bot_path = join(__dirname, 'bot');

    super(bot_path, {
      workerData: { uin, config },
    });
    bot_workers.set(uin, this);

    this
      .on('online', () => {
        logger.debug(`机器人 ${uin} 线程已创建`);
      })
      .on('message', (event) => {
        console.log(`主线程收到 bot 消息`, event);
      })
      .on('exit', (code) => {
        logger.debug(`机器人线程已退出，代码: ${code}`)

        // if (code) {
        //   console.log('正在重启...');

        //   setTimeout(() => {
        //     createBotWorker(uin, config);
        //   }, 1000);
        // }
      })
  }
}

class PluginWorker extends Worker {
  constructor(info: PluginInfo) {
    const { name, path } = info;

    super(path);
    plugin_workers.set(name, this);

    this
      .on('online', () => {
        logger.debug(`插件 ${name} 线程已创建`);
      })
      .on('message', (event) => {
        console.log(`主线程收到 plugin 消息`, event);
      })
      .on('exit', (code) => {
        logger.debug(`插件线程已退出，代码: ${code}`);
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

  // 建立插件通信
  plugin_workers.forEach((plugin_worker) => {
    const { port1: botPort, port2: pluginPort } = new MessageChannel();

    plugin_worker.postMessage({
      name: 'bind.port',
      event: {
        port: botPort,
      },
    }, [botPort]);

    bot_workers.forEach((bot_worker) => {
      bot_worker.postMessage({
        name: 'bind.port',
        event: {
          port: pluginPort,
        },
      }, [pluginPort]);
    });
  });
}
