import { join } from 'path';
import { createHash } from 'crypto';
import { deepClone, deepMerge } from '@kokkoro/utils';
import { readFile, writeFile } from 'fs/promises';
import { Client, Config as Protocol, GroupMessage, MemberIncreaseEvent } from 'oicq';
import { isMainThread, parentPort, workerData, MessagePort } from 'worker_threads';

import { PortEventMap } from './events';
import { proxyParentPort } from './worker';
import { getSetting, Setting, writeSetting } from './profile/setting';

const admins: Set<number> = new Set([
  parseInt('84a11e2b', 16),
]);
const bot_dir = join(__workname, 'data', 'bot');

export type BotWorkerData = {
  uin: number;
  config: Config;
};
export type UserLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Config = {
  // 自动登录，默认 true
  auto_login: boolean;
  // 登录模式，默认 qrcode
  mode: 'qrcode' | 'password';
  // bot 主人
  masters: number[];
  // 协议配置
  protocol: Protocol;
};

export class Bot extends Client {
  private masters: number[];
  private setting!: Setting;
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

    this.masters = [];
    this.mode = config.mode!;
    this.password_path = join(this.dir, 'password');
    this.pluginPort = new Map();

    // 绑定插件线程通信
    parentPort?.on('bind.plugin.port', (event: PortEventMap['bind.plugin.port']) => {
      const { name, port } = event;
      console.log('bot bind.plugin.port')
      // 线程事件代理
      port.on('message', (value: any) => {
        console.log('bot 代理事件 ', value)
        if (value.name) {
          port.emit(value.name, value.event);
        }
        this.logger.info('bot 收到了消息:', value);
      });

      this.listenPortEvents(port);
      this.pluginPort.set(name, port);
    });

    // 首次上线
    this.once('system.online', async () => {
      this.setting = await getSetting(uin);
      // this.bindBotEvents();
      // this.emit('init.setting');
      // this.sendMasterMsg('おはようございます、主様♪');
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
    parentPort?.postMessage('input');
    parentPort?.once('input', (text) => {
      this.submitSlider(text);
    });
  }

  /**
   * 获取用户权限等级
   *
   * level 0 群成员（随活跃度提升）
   * level 1 群成员（随活跃度提升）
   * level 2 群成员（随活跃度提升）
   * level 3 管  理
   * level 4 群  主
   * level 5 主  人
   * level 6 维护组
   *
   * @param event - 消息事件
   * @returns 用户等级
   */
  private getUserLevel(event: GroupMessage): UserLevel {
    const { sender } = event;
    const { user_id, level = 0, role = 'member' } = sender as any;

    let user_level: UserLevel;

    switch (true) {
      case admins.has(user_id):
        user_level = 6
        break;
      case this.masters.includes(user_id):
        user_level = 5
        break;
      case role === 'owner':
        user_level = 4
        break;
      case role === 'admin':
        user_level = 3
        break;
      case level > 4:
        user_level = 2
        break;
      case level > 2:
        user_level = 1
        break;
      default:
        user_level = 0
        break;
    }
    return user_level;
  }

  private inputPassword(): void {
    process.stdout.write('首次登录请输入密码: ');
    parentPort?.postMessage('input');
    parentPort?.once('input', (text) => {
      if (!text.length) {
        return this.inputPassword();
      }
      const password = createHash('md5').update(text).digest();

      writeFile(this.password_path, password, { mode: 0o600 })
        .then(() => this.logger.mark('写入 password md5 成功'))
        .catch(error => this.logger.error(`写入 password md5 失败，${error.message}`))
        .finally(() => this.login(password));
    });
  }

  // 监听主线程端口事件
  private listenPortEvents<T extends keyof Bot>(port: MessagePort) {
    //     // 绑定插件配置
    //     port.on('bind.setting', (event: PortEventMap['bind.setting']) => {
    //       if (!this.isOnline()) {
    //         this.once('init.setting', () => {
    //           port.emit('bind.setting', event);
    //         })
    //       }
    //       const { name, option } = event;

    //       for (const [_, group_info] of this.gl) {
    //         const { group_id, group_name } = group_info;

    //         this.setting[group_id] ||= {
    //           name: group_name, plugin: {},
    //         };

    //         if (this.setting[group_id].name !== group_name) {
    //           this.setting[group_id].name = group_name;
    //         }
    //         const local_option = this.setting[group_id].plugin[name];

    //         this.setting[group_id].plugin[name] = deepClone(deepMerge(option, local_option));
    //       }

    //       if (this.setting) {
    //         writeSetting(this.uin, this.setting);
    //       }
    // });

    // 事件监听
    port.on('bind.plugin.listen', (event: PortEventMap['bind.plugin.listen']) => {
      const { name, listen } = event;

      this.on(listen !== 'message.all' ? listen : 'message', (e: any) => {
        for (const key in e) {
          if (typeof e[key] === 'function') delete e[key];
        }

        if (e.message_type === 'group') {
          e.option = this.setting[e.group_id].plugin[name];
          e.permission_level = this.getUserLevel(e);
        }
        port.postMessage({
          name: listen, event: e,
        });
      });
      this.logger.info(`插件 ${name} 绑定 ${listen} 事件`);
    });


    // 发送消息
    port.on('bot.api', async (event: PortEventMap['bot.api']) => {
      const { method, params } = event as {
        method: T, params: any[],
      };

      let value;
      if (typeof this[method] === 'function') {
        value = await (this[method] as Function)(...params);
      } else {
        value = this[method];
      }

      port.postMessage({
        name: 'bot.api.callback',
        event: value,
      });
    });

    //     // 发送消息
    //     port.on('message.send', (event: PortEventMap['message.send']) => {
    //       this.sendMessage(event);
    //     });

    //     // 撤回消息
    //     port.on('message.recall', (event: any) => {
    //       this.recallMessage(event);
    //     });
  }

  //   // 监听 bot 事件
  //   private bindBotEvents() {
  //     this.removeAllListeners('system.login.slider');
  //     this.removeAllListeners('system.login.device');
  //     this.removeAllListeners('system.login.qrcode');

  //     this.on('system.online', this.onOnline);
  //     this.on('system.offline', this.onOffline);
  //     this.on('notice.group.increase', this.onGroupIncrease);
  //     // this.on('notice.group.decrease', this.onGroupDecrease);
  //   }

  //   private onOnline(): void {
  //     this.sendMasterMsg('该账号刚刚从离线中恢复，现在一切正常');
  //     this.logger.mark(`${this.nickname} 刚刚从离线中恢复，现在一切正常`);
  //   }

  //   private onOffline(event: { message: string }): void {
  //     this.logger.mark(`${this.nickname} 已离线，${event.message}`);
  //   }

  //   private async onGroupIncrease(event: MemberIncreaseEvent): Promise<void> {
  //     if (event.user_id !== this.uin) return;

  //     // const group_id = event.group_id;
  //     // const group_name = (await this.getGroupInfo(group_id)).group_name;

  //     // this.setting[group_id] ||= {
  //     //   name: group_name, plugin: {},
  //     // };

  //     // if (this.setting[group_id].name !== group_name) {
  //     //   this.setting[group_id].name = group_name;
  //     // }
  //     // for (const name of this.setting.plugins) {
  //     //   try {
  //     //     const plugin = await getPlugin(name);
  //     //     const default_option = plugin.getOption();
  //     //     const local_option = setting[group_id].plugin[name];
  //     //     const option = deepMerge(default_option, local_option);

  //     //     setting[group_id].plugin[name] = option;
  //     //   } catch (error) {
  //     //     this.logger.error((error as Error).message);
  //     //   }
  //     // }
  //     // writeSetting(this.uin)
  //     //   .then(() => {
  //     //     this.logger.info(`更新了群配置，新增了群：${group_id}`);
  //     //   })
  //     //   .catch(error => {
  //     //     this.logger.error(`群配置失败，${error.message}`);
  //     //   })
  //   }

  //   // 给 bot 主人发送信息
  //   private sendMasterMsg(message: string): void {
  //     for (const uin of this.masters) {
  //       this.sendPrivateMsg(uin, message);
  //     }
  //   }

  //   // 消息发送
  //   sendMessage(event: PortEventMap['message.send']) {
  //     switch (event.type) {
  //       case 'private':
  //         this.sendPrivateMsg(event.user_id, event.message);
  //         break;
  //       case 'group':
  //         this.sendGroupMsg(event.group_id, event.message);
  //         break;
  //     }
  //   }



  //   // 撤回消息
  //   recallMessage(event: any) {
  //     const group = this.pickGroup(event.group_id);

  //     switch (event.type) {
  //       case 'private':
  //         group.recallMsg(event.seq, event.rand);
  //         break;
  //       case 'group':
  //         group.recallMsg(event.seq, event.rand);
  //         break;
  //     }
  //   }
}


if (isMainThread) {
  throw new Error('你在主线程跑这个干吗？');
} else {
  const { uin, config } = workerData as BotWorkerData;
  const bot = new Bot(uin, config);

  bot.linkStart();
}
