import { join } from 'path';
import { createHash } from 'crypto';
import { deepMerge } from '@kokkoro/utils';
import { readFile, writeFile } from 'fs/promises';
import { Client, Config as Protocol } from 'oicq';
import { isMainThread, parentPort, workerData, MessagePort } from 'worker_threads';

import { bot_dir } from '.';
import { proxyParentPort } from './worker';

const admin: Set<number> = new Set([
  parseInt('84a11e2b', 16),
]);

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
  private pluginPort: Map<string, MessagePort>;
  private readonly mode: 'qrcode' | 'password';
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
    proxyParentPort();

    this.mode = config.mode!;
    this.password_path = join(this.dir, 'password');
    this.pluginPort = new Map();

    // 绑定插件线程通信
    parentPort?.on('bind.port', (event: { name: string, port: MessagePort }) => {
      const { name, port } = event;

      // 线程事件代理
      port.on('message', (message: any) => {
        if (message.name) {
          port.emit(message.name, message.event);
        }
        console.log('bot 收到了消息:', message);
      });

      this.listenPortEvent(port);
      this.pluginPort.set(name, port);
    });
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
    });
  }

  private listenPortEvent(port: MessagePort) {
    // 事件监听
    port.on('bind.event', (event: any) => {
      this.on(event.name, (event: any) => {
        for (const key in event) {
          if (typeof event[key] === 'function') {
            delete event[key];
          }
        }
        port.postMessage(event);
      });
      this.logger.debug(`插件 ${event.prefix} 绑定 ${event.name} 事件`);
    });

    // 发送消息
    port.on('message.send', (event: any) => {
      this.sendMessage(event);
    });

    // 撤回消息
    port.on('message.recall', (event: any) => {
      this.recallMessage(event);
    });
  }

  // 发送消息
  sendMessage(event: any) {
    switch (event.type) {
      case 'private':
        this.sendPrivateMsg(event.user_id, event.message);
        break;
      case 'group':
        this.sendGroupMsg(event.group_id, event.message);
        break;
    }
  }

  // 消息撤回
  recallMessage(event: any) {

  }
}

if (isMainThread) {
  throw new Error('你在主线程跑这个干吗？');
} else {
  const { uin, config } = workerData;
  const bot = new Bot(uin, config);

  bot.linkStart();
}
