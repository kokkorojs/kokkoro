import { checkUin, deepMerge } from '@kokkoro/utils';
import { EventEmitter } from 'events';
import { Client, Config as Protocol, MemberDecreaseEvent, MemberIncreaseEvent, PrivateMessageEvent, segment } from 'oicq';
import { isMainThread, Worker, workerData, parentPort } from 'worker_threads';

import { bot_dir } from '.';
import { getGlobalConfig } from './config';

const admins: Set<number> = new Set([
  parseInt('84a11e2b', 16),
]);
const bot_pool: Map<number, Worker> = new Map();

export interface Config {
  // 自动登录，默认 true
  auto_login?: boolean;
  // 登录模式，默认 qrcode
  mode?: 'qrcode' | 'password';
  // bot 主人
  masters?: number[];
  // 协议配置
  protocol?: Protocol;
}

// export class Bot extends Client {
//   constructor(uin: number, config?: Config) {
//     const default_config: Config = {
//       auto_login: true,
//       masters: [],
//       mode: 'qrcode',
//       protocol: {
//         data_dir: bot_dir,
//       },
//     };
//     config = deepMerge(default_config, config);

//     super(uin, config.protocol);
//   }
// }


export class Bot extends EventEmitter {
  constructor(
    public uin: number, config?: Config) {
    const default_config: Config = {
      auto_login: true,
      masters: [],
      mode: 'qrcode',
      protocol: {
        data_dir: bot_dir,
      },
    };
    config = deepMerge(default_config, config);

    super();
  }

  linkStart() {
    parentPort?.postMessage(`${this.uin} login`);
  }
}


/**
 * 创建 bot 对象
 * 
 * @param {number} uin - bot uin
 * @param {Config} config - bot config
 * @returns {Bot} bot 实例对象
 */
export function createBot(uin: number, config?: Config): Bot {
  if (!checkUin(uin)) {
    throw new Error(`${uin} is not an qq account`);
  }
  return new Bot(uin, config);
}

/**
 * 创建 bot 线程
 * 
 * @param {number} uin - bot uin
 * @param {Config} config - bot config
 * @returns {Bot} bot 实例对象
 */
export function createBotThread(uin: number, config?: Config): void {
  const worker = new Worker(__filename, {
    workerData: uin,
  });

  worker
    .on('online', () => {
      console.log(`创建 bot ${uin} 线程`);
    })
    .on('message', (message) => {
      console.log(`主线程收到消息`, message);
      // worker.postMessage(message);
    })
    .on('error', error => {
      console.log(`线程 ${uin}炸了，`, error.message);
    })
    .on('exit', code => {
      console.log(`${uin} 线程已退出，代码: ${code}`);
      //   console.log('正在重启...');

      //   setTimeout(() => {
      //     createChildThread(filename);
      //   }, 1000);
    })

  bot_pool.set(uin, worker);
}

export function runBotServer() {
  const bots = getGlobalConfig('bots');

  Object.keys(bots).forEach(uin => {
    createBotThread(+uin);
  });
}

if (!isMainThread) {
  const uin = +workerData;
  const bot = createBot(uin);

  bot.linkStart();
  parentPort!.on('message', (message) => {
    console.log(`工作线程收到消息`, message);
  })
}
