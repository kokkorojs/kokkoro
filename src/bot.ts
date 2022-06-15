import { checkUin, deepMerge, logger } from '@kokkoro/utils';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { Client, Config as Protocol, MemberDecreaseEvent, MemberIncreaseEvent, PrivateMessageEvent, segment } from 'oicq';
import { isMainThread, Worker, workerData, parentPort } from 'worker_threads';

import { bot_dir } from '.';
import { getGlobalConfig } from './config';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

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

export class Bot extends Client {
  private mode: 'qrcode' | 'password';
  private readonly password_path: string;

  constructor(uin: number, config?: Config) {
    const default_config: Config = {
      auto_login: true,
      masters: [],
      mode: 'qrcode',
      protocol: {
        data_dir: bot_dir,
      },
    };
    config = deepMerge(default_config, config);

    super(uin, config.protocol);

    this.mode = config.mode!;
    this.password_path = join(this.dir, 'password');
    this.on('system.online', () => {
      parentPort!.postMessage(`${this.uin} 登录成功`);
    })
    this.on('system.offline', () => {
      parentPort!.postMessage(`${this.uin} 登出成功`);
    })
  }

  async linkStart(): Promise<void> {
    switch (this.mode) {
      /**
       * 扫描登录
       * 
       * 优点是不需要过滑块和设备锁
       * 缺点是万一 token 失效，无法自动登录，需要重新扫码
       */
      case 'qrcode':
        this
          .on('system.login.qrcode', (event) => {
            // 扫码轮询
            const interval_id = setInterval(async () => {
              const { retcode } = await this.queryQrcodeResult();

              // 0:扫码完成 48:未确认 53:取消扫码
              if (retcode === 0 || ![48, 53].includes(retcode)) {
                this.login();
                clearInterval(interval_id);
              }
            }, 2000);
          })
          .once('system.login.error', (event) => {
            const { message } = event;

            this.terminate();
            this.logger.error(`当前账号无法登录，${message}`);
            throw new Error(message);
          })
          .login();
        break;
      /**
       * 密码登录
       * 
       * 优点是一劳永逸
       * 缺点是需要过滑块，可能会报环境异常
       */
      case 'password':
        this
          .on('system.login.slider', (event) => this.inputTicket())
          .on('system.login.device', () => {
            // TODO ⎛⎝≥⏝⏝≤⎛⎝ 设备锁轮询，oicq 暂无相关 func
            this.logger.mark('验证完成后按回车键继续...');

            process.stdin.once('data', () => {
              this.login();
            });
          })
          .once('system.login.error', (event) => {
            const { message } = event;

            if (message.includes('密码错误')) {
              this.inputPassword();
            } else {
              this.terminate();
              this.logger.error(`当前账号无法登录，${message}`);
              throw new Error(message);
            }
          });

        try {
          const password = await readFile(this.password_path);
          this.login(password);
        } catch (error) {
          this.inputPassword();
        }
        break;
      default:
        this.terminate();
        this.logger.error(`你他喵的 "login_mode" 改错了 (ㅍ_ㅍ)`);
        throw new Error('invalid mode');
    }
    await new Promise(resolve => this.once('system.online', resolve));
  }

  private inputTicket(): void {
    this.logger.mark('取 ticket 教程: https://github.com/takayama-lily/oicq/wiki/01.滑动验证码和设备锁');

    process.stdout.write('请输入 ticket : ');
    process.stdin.once('data', (event: string) => {
      this.submitSlider(event);
    });
  }

  private inputPassword(): void {
    process.stdout.write('首次登录请输入密码: ');
    process.stdin.once('data', (password: string) => {
      password = password.trim();

      if (!password.length) {
        return this.inputPassword();
      }
      const password_md5 = createHash('md5').update(password).digest();

      writeFile(this.password_path, password_md5, { mode: 0o600 })
        .then(() => this.logger.mark('写入 password md5 成功'))
        .catch(error => this.logger.error(`写入 password md5 失败，${error.message}`))
        .finally(() => this.login(password_md5));
    })
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
    workerData: JSON.stringify({
      uin, config,
    }),
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
      console.log('正在重启...');

      setTimeout(() => {
        createBotThread(uin, config);
      }, 1000);
    })

  bot_pool.set(uin, worker);
}

export function runBotServer() {
  const bot = getGlobalConfig('bots');
  const bot_keys = Object.keys(bot);

  if (bot_keys.length > 1) {
    logger.warn('v0.4 不支持多账号在控制台登录，未来 web 完善后将会移除现有登录逻辑');
    process.exit();
  }

  bot_keys.forEach(uin => {
    const config = bot[+uin];
    createBotThread(+uin, config);
  });
}

if (!isMainThread && workerData) {
  const { uin, config } = JSON.parse(workerData);
  const bot = createBot(uin, config);

  bot.linkStart();
  bot.on('message', event => {
    if (event.raw_message === 'exit') {
      process.exit();
    }
  })
  parentPort!.on('message', (message) => {
    console.log(`bot 工作线程收到消息`, message);
  })
}
