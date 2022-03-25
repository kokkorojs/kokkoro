import { join } from 'path';
import { createHash } from 'crypto';
import { writeFile, readFile } from 'fs/promises';
import { Client, Config as Protocol, DiscussMessageEvent, GroupMessageEvent, GroupRole, PrivateMessageEvent, segment, MemberIncreaseEvent } from 'oicq';

import { restorePlugin } from './plugin';
import { reloadSetting } from './setting';
import { setBotConfig, getConfig } from './config';
import { logger, colors, deepMerge } from './util';
import { all_command, CommandType, parseCommand } from './command';
import { KOKKORO_UPDAY, KOKKORO_VERSION, KOKKORO_CHANGELOGS } from './help';

// 维护组 QQ
const admin: number[] = [2225151531];
// 所有机器人实例
// const all_bot: Map<number, Bot> = new Map();

export interface Config {
  // 自动登录，默认 true
  auto_login?: boolean;
  // 登录模式，默认 qrcode
  login_mode?: 'qrcode' | 'password';
  // bot 主人
  master?: number[];
  // 协议配置
  protocol?: Protocol;
}

export type AllMessageEvent = GroupMessageEvent | PrivateMessageEvent | DiscussMessageEvent;

export class Bot extends Client {
  public master: number[];
  private login_mode: string;
  private readonly password_path: string;

  constructor(qq: number, config?: Config) {
    config = {
      master: [],
      auto_login: true,
      login_mode: 'qrcode',
      protocol: {}, ...config,
    }
    config.protocol!.data_dir = './data/bot';
    console.log(config)

    super(qq, config.protocol);

    this.master = config.master!;
    this.login_mode = config.login_mode!;
    this.password_path = join(this.dir, 'password');

    // this.once('system.online', async () => {
    //   await this.bindMasterEvents();
    //   this.logger.mark(`可给机器人发送 "${this.prefix}help" 查看指令帮助`);
    // });
  }

  inputPassword() {
    this.logger.mark('首次登录请输入密码：');

    process.stdin.once('data', data => {
      const input = String(data).trim();

      if (!input.length) return this.inputPassword();

      const password = createHash('md5').update(input).digest();

      writeFile(this.password_path, password, { mode: 0o600 })
        .then(() => {
          this.logger.mark('写入 md5 成功');
        })
        .catch(error => {
          this.logger.error(`写入 md5 失败，${error.message}`);
        })
        .finally(() => {
          this.login(password);
        })
    })
  }

  async linkStart() {
    switch (this.login_mode) {
      /**
       * 扫描登录
       * 
       * 优点是不需要过滑块和设备锁
       * 缺点是万一 token 失效，无法自动登录，需要重新扫码
       */
      case 'qrcode':
        this
          .on('system.login.qrcode', (event) => {
            const interval_id = setInterval(async () => {
              const { retcode } = await this.queryQrcodeResult();

              if (retcode === 0 || ![48, 53].includes(retcode)) {
                this.login();
                clearInterval(interval_id);
              }
            }, 2000);
          })
          .on('system.login.error', (event) => {
            const { message } = event;

            this.terminate();
            this.logger.error(`当前账号无法登录，${message}`);

            process.stdin.once('data', () => { });
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
          // 监听滑动验证码事件
          .on('system.login.slider', (event) => {
            this.logger.mark('取 ticket 教程：https://github.com/takayama-lily/oicq/wiki/01.滑动验证码和设备锁');

            process.stdout.write('ticket: ');
            process.stdin.once('data', (event: string) => {
              this.submitSlider(event);
            });
          })
          // 监听登录保护验证事件
          .on('system.login.device', () => {
            this.logger.mark('验证完成后按回车键继续...');

            process.stdin.once('data', () => {
              this.login();
            });
          })
          .on('system.login.error', (event) => {
            const { message } = event;

            if (message.includes('密码错误')) {
              this.inputPassword();
            } else {
              this.terminate();
              this.logger.error(`当前账号无法登录，${message}`);

              process.stdin.once('data', () => { });
            }
          });

        try {
          const password = await readFile(this.password_path);
          this.login(password);
        } catch {
          this.inputPassword();
        }
        break;
      default:
        this.terminate();
        this.logger.error(`你他喵的 "login_mode" 改错了 (ㅍ_ㅍ)`);
        break;
    }
  }

  //   /**
  //    * 获取用户权限等级
  //    * 
  //    * level 0 群成员（随活跃度提升）
  //    * level 1 群成员（随活跃度提升）
  //    * level 2 群成员（随活跃度提升）
  //    * level 3 管  理
  //    * level 4 群  主
  //    * level 5 主  人
  //    * level 6 维护组
  //    * 
  //    * @param {AllMessageEvent} event - 消息 event
  //    * @returns {number} 用户等级
  //    */
  //   getUserLevel(event: AllMessageEvent): number {
  //     const { sender } = event;
  //     const { user_id, level = 0, role = 'member' } = sender as { user_id: number, level?: number, role?: GroupRole };

  //     let user_level: number;

  //     switch (true) {
  //       case admin.includes(user_id):
  //         user_level = 6
  //         break;
  //       case this.masters.includes(user_id):
  //         user_level = 5
  //         break;
  //       case role === 'owner':
  //         user_level = 4
  //         break;
  //       case role === 'admin':
  //         user_level = 3
  //         break;
  //       case level > 4:
  //         user_level = 2
  //         break;
  //       case level > 2:
  //         user_level = 1
  //         break;
  //       default:
  //         user_level = 0
  //         break;
  //     }

  //     return user_level;
  //   }

  //   sendMasterMsg(message: string) {
  //     for (const user_id of this.masters) {
  //       this.sendPrivateMsg(user_id, `通知：\n　　${message}`)
  //     }
  //   }

  //   onOnline() {
  //     this.logger.info(`${this.nickname} 刚刚从掉线中恢复，现在一切正常`);
  //     this.sendMasterMsg(`通知：\n　　该账号刚刚从掉线中恢复，现在一切正常`);
  //   }

  //   onOffline(event: { message: string }) {
  //     this.logger.info(`${this.nickname} 已离线，${event.message}`);
  //   }

  //   async onMessage(event: AllMessageEvent) {
  //     let tip = '';
  //     const { message_type, raw_message } = event;
  //     const user_level = this.getUserLevel(event);

  //     if (!raw_message.startsWith(this.prefix)) return;

  //     // 权限判断，群聊指令需要 level 3 以上，私聊指令需要 level 5 以上
  //     switch (message_type) {
  //       case 'group':
  //         if (user_level < 3) tip = '权限不足';
  //         break;
  //       case 'private':
  //         if (user_level < 5) tip = '权限不足';
  //         break;
  //     }

  //     if (tip) return event.reply(tip);

  //     const command = raw_message.replace(this.prefix, '').trim();
  //     const { order, param } = parseCommand(command);

  //     for (const type of ['all', 'group', 'private'] as CommandType[]) {
  //       if (!all_command[type][order]) continue;

  //       this.logger.mark(`收到指令，正在处理: ${raw_message}`);

  //       if (message_type !== type && type !== 'all') {
  //         tip = `Error：指令 ${order} 不支持${message_type === 'private' ? '私聊' : '群聊'}`;
  //         break;
  //       }

  //       await all_command[type][order].call(this, param, event)
  //         .then((message) => {
  //           tip = message;
  //           this.logger.mark(`处理完毕，指令回复: ${tip}`);
  //         })
  //         .catch((error: Error) => {
  //           tip = error.message;
  //         })
  //       break;
  //     }

  //     tip ||= `Error：未知指令 "${order}"`;
  //     event.reply(tip);
  //   }

  //   async reload(event: MemberIncreaseEvent) {
  //     const { uin } = this;
  //     const { user_id } = event;

  //     if (uin === user_id) {
  //       await reloadSetting(this);
  //     }
  //   }

  //   async bindMasterEvents() {
  //     this.removeAllListeners('system.login.slider');
  //     this.removeAllListeners('system.login.device');
  //     this.removeAllListeners('system.login.qrcode');
  //     this.removeAllListeners('system.login.error');

  //     this.on('message', this.onMessage);
  //     this.on('system.online', this.onOnline);
  //     this.on('system.offline', this.onOffline);
  //     this.on('notice.group.increase', this.reload);

  //     let plugin_count = 0;
  //     const all_plugin = await restorePlugin(this);

  //     for (const [_, plugin] of all_plugin) {
  //       if (plugin.roster.has(this.uin)) ++plugin_count;
  //     }

  //     this.sendMasterMsg(`启动成功，启用了 ${plugin_count} 个插件，发送 "${this.prefix}help" 可以查询 bot 相关指令`);
  //   }
  // }

  // export function getAllBot(): Map<number, Bot> {
  //   return all_bot;
  // }

  // export function getBot(uin: number): Bot | undefined {
  //   return all_bot.get(uin);
  // }

  // /**
  //  * 添加一个新的 bot 并登录
  //  * 
  //  * @param {Bot} this - 被私聊的 bot 对象
  //  * @param {number} uin - 添加的 uin
  //  * @param {PrivateMessageEvent} delegate 私聊消息 event
  //  */
  // export function addBot(this: Bot, uin: number, delegate: PrivateMessageEvent) {
  //   const bot_config: BotConfig = {
  //     prefix: '>',
  //     auto_login: true,
  //     login_mode: 'qrcode',
  //     masters: [delegate.from_id],
  //     config: {
  //       log_level: 'info',
  //       platform: 1,
  //       ignore_self: true,
  //       resend: true,
  //       data_dir: './data/bot',
  //       reconn_interval: 5,
  //       cache_group_member: true,
  //       auto_server: true
  //     }
  //   };
  //   const bot = new Bot(uin);

  //   bot
  //     .on("system.login.qrcode", event => {
  //       delegate.reply([
  //         segment.image(event.image),
  //         `>扫码完成：输入 "ok"\n>取消登录：输入 "cancel"`,
  //       ]);

  //       // 监听消息
  //       this.on("message.private", function listenLogin(event) {
  //         if (event.from_id === delegate.from_id) {
  //           this.off("message.private", listenLogin);

  //           switch (event.raw_message) {
  //             case 'ok':
  //               bot.login();
  //               break;
  //             case 'cancel':
  //               bot.terminate();
  //               delegate.reply(">登录流程：已取消");
  //               break;
  //           }
  //         }
  //       })
  //     })
  //     .once("system.login.error", data => {
  //       this.terminate();
  //       delegate.reply(`>发生错误：${data.message}`);
  //     })
  //     .once('system.online', () => {
  //       setBotConfig(uin, bot_config)
  //         .then(() => {
  //           bot.logger.mark('写入 kokkoro.yml 成功');
  //         })
  //         .catch(() => {
  //           bot.logger.error('写入 kokkoro.yml 失败');
  //         })
  //         .finally(() => {
  //           all_bot.set(uin, bot);
  //           delegate.reply(">登录成功");
  //         });
  //     })
  //     .login();
}

// export async function startup() {
//   // Acsii Font Name: Doh
//   const wellcome = `———————————————————————————————————————————————————————————————————————————————————————————————————
//                   _ _                            _          _         _    _
//                  | | |                          | |        | |       | |  | |
//     __      _____| | | ___ ___  _ __ ___   ___  | |_ ___   | | _____ | | _| | _____  _ __ ___
//     \\ \\ /\\ / / _ \\ | |/ __/ _ \\| '_ \` _ \\ / _ \\ | __/ _ \\  | |/ / _ \\| |/ / |/ / _ \\| '__/ _ \\
//      \\ V  V /  __/ | | (_| (_) | | | | | |  __/ | || (_) | |   < (_) |   <|   < (_) | | | (_) |
//       \\_/\\_/ \\___|_|_|\\___\\___/|_| |_| |_|\\___|  \\__\\___/  |_|\\_\\___/|_|\\_\\_|\\_\\___/|_|  \\___/

// ———————————————————————————————————————————————————————————————————————————————————————————————————`;
//   console.log(colors.cyan(wellcome))

//   logger.mark(`----------`);
//   logger.mark(`Package Version: kokkoro@${KOKKORO_VERSION} (Released on ${KOKKORO_UPDAY})`);
//   logger.mark(`View Changelogs：${KOKKORO_CHANGELOGS}`);
//   logger.mark(`----------`);
//   logger.mark(`项目启动完成，开始登录账号`);

//   process.title = 'kokkoro';

//   const { bots } = getConfig();

//   for (const uin in bots) {
//     const bot_config = bots[uin];
//     const qq = +uin;
//     const bot = new Bot(qq, bot_config);

//     all_bot.set(qq, bot);

//     if (!bot_config.auto_login) continue;
//     if (!all_bot.size) return logger.info(`当前无可登录的账号，请检查是否开启 ${colors.blue('auto_login')}`);

//     await bot.linkStart();
//   }
// }
