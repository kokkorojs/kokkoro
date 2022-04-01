import { join } from 'path';
import { createHash } from 'crypto';
import { writeFile, readFile } from 'fs/promises';
import { Client, Config as Protocol, DiscussMessageEvent, GroupMessageEvent, GroupRole, PrivateMessageEvent } from 'oicq';

// import { restorePlugin } from './plugin';
// import { reloadSetting } from './setting';
import { bindExtension, extension } from './extension';
import { setBotConfig, getConfig } from './config';
import { deepMerge, logger, section } from './util';
import { EventEmitter } from 'events';
// import { all_command, CommandType, parseCommand } from './command';

// admin list
const al: Set<number> = new Set([
  parseInt('84a11e2b', 16),
]);
// bot list
const bl: Map<number, Bot> = new Map();
const emitter = new EventEmitter();

emitter.once('logined', () => {
  // TODO 绑定插件
  bindExtension();
  logger.mark(`可给机器人发送 "help" 查看指令帮助`);
});

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

export type AllMessageEvent = GroupMessageEvent | PrivateMessageEvent | DiscussMessageEvent;

export class Bot extends Client {
  public ml: Set<number>;
  private mode: string;
  private readonly password_path: string;

  constructor(uin: number, config?: Config) {
    const default_config: Config = {
      auto_login: true,
      masters: [],
      mode: 'qrcode',
      protocol: {
        data_dir: './data/bot',
      },
    };
    deepMerge(default_config, config);

    super(uin, default_config.protocol);

    this.ml = new Set(default_config.masters);
    this.mode = default_config.mode!;
    this.password_path = join(this.dir, 'password');

    this.once('system.online', async () => {
      this.removeListen();
      extension.bindBot(this);
    });
  }

  removeListen(): void {
    this.removeAllListeners('system.login.slider');
    this.removeAllListeners('system.login.device');
    this.removeAllListeners('system.login.qrcode');
    this.removeAllListeners('system.login.error');

    //     let plugin_count = 0;
    //     const all_plugin = await restorePlugin(this);

    //     for (const [_, plugin] of all_plugin) {
    //       if (plugin.roster.has(this.uin)) ++plugin_count;
    //     }

    //     this.sendMasterMsg(`启动成功，启用了 ${plugin_count} 个插件，发送 "${this.prefix}help" 可以查询 bot 相关指令`);
    //   }
  }

  inputPassword(): void {
    process.stdin.setEncoding('utf8');
    process.stdout.write('首次登录请输入密码：');
    process.stdin.once('data', (password: string) => {
      password = password.trim();

      if (!password.length) return this.inputPassword();

      const password_md5 = createHash('md5').update(password).digest();

      writeFile(this.password_path, password_md5, { mode: 0o600 })
        .then(() => this.logger.mark('写入 password md5 成功'))
        .catch(error => this.logger.error(`写入 password md5 失败，${error.message}`))
        .finally(() => this.login(password_md5));
    })
  }

  linkStart() {
    return new Promise(async (resolve, reject) => {
      this.once('system.online', () => {
        resolve(null);
      });
      switch (this.mode) {
        /**
         * 扫描登录
         * 
         * 优点是不需要过滑块和设备锁
         * 缺点是万一 token 失效，无法自动登录，需要重新扫码
         */
        case 'qrcode':
          this
            .on('system.login.qrcode', (event: { image: Buffer; }) => {
              const interval_id = setInterval(async () => {
                const { retcode } = await this.queryQrcodeResult();

                if (retcode === 0 || ![48, 53].includes(retcode)) {
                  this.login();
                  clearInterval(interval_id);
                }
              }, 2000);
            })
            .on('system.login.error', (event: { code: number; message: string; }) => {
              const { message } = event;

              this.terminate();
              this.logger.error(`当前账号无法登录，${message}`);
              reject(new Error(message));
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
            .on('system.login.slider', (event: { url: string; }) => {
              this.logger.mark('取 ticket 教程：https://github.com/takayama-lily/oicq/wiki/01.滑动验证码和设备锁');

              process.stdout.write('请输入 ticket ：');
              process.stdin.once('data', (event: string) => {
                this.submitSlider(event);
              });
            })
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
                reject(new Error(message));
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
          reject(new Error('invalid mode'));
      }
    })
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
   * @param {AllMessageEvent} event - 消息
   * @returns {number} 用户等级
   */
  getUserLevel(event: AllMessageEvent): number {
    const { sender } = event;
    const { user_id, level = 0, role = 'member' } = sender as { user_id: number, level?: number, role?: GroupRole };

    let user_level: number;

    switch (true) {
      case al.has(user_id):
        user_level = 6
        break;
      case this.ml.has(user_id):
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

  /**
   * 给 bot 主人发送信息
   * 
   * @param {string} message - 通知信息 
   */
  sendMasterMsg(message: string): void {
    for (const qq of this.ml) {
      this.sendPrivateMsg(qq, `通知：\n　　${message}`)
    }
  }

  // onMessage(event: AllMessageEvent) {
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




}

export function getBot(uin: number): Bot | undefined {
  return bl.get(uin);
}

export function getAllBot(): Map<number, Bot> {
  return bl;
}

/**
 * 添加一个新的 bot 并登录
 * 
 * @param {Bot} this - 被私聊的 bot 对象
 * @param {number} uin - 添加的 uin
 * @param {PrivateMessageEvent} delegate 私聊消息 event
 */
export function addBot(this: Bot, uin: number, delegate: PrivateMessageEvent) {
  const config: Config = {
    auto_login: true,
    mode: 'qrcode',
    masters: [delegate.from_id],
    protocol: {
      log_level: 'info',
      platform: 1,
      ignore_self: true,
      resend: true,
      data_dir: './data/bot',
      reconn_interval: 5,
      cache_group_member: true,
      auto_server: true,
    }
  };
  const bot = new Bot(uin);

  bot
    .on('system.login.qrcode', (event) => {
      delegate.reply([
        section.image(event.image),
        '\n使用手机 QQ 扫码登录，输入 “cancel” 取消登录',
      ]);

      const interval_id = setInterval(async () => {
        const { retcode } = await bot.queryQrcodeResult();

        if (retcode === 0 || ![48, 53].includes(retcode)) {
          bot.login();
          clearInterval(interval_id);
        }
      }, 2000);

      this.on('message.private', function listenLogin(event) {
        if (event.from_id === delegate.from_id && event.raw_message === 'cancel') {
          bot.terminate();
          clearInterval(interval_id);
          delegate.reply('登录已取消');
          this.off('message.private', listenLogin);
        }
      })
    })
    .once('system.login.error', data => {
      this.terminate();
      delegate.reply(`Error: ${data.message}`);
    })
    .once('system.online', () => {
      setBotConfig(uin, config)
        .then(() => {
          bot.logger.mark('写入 kokkoro.yml 成功');
        })
        .catch(() => {
          bot.logger.error('写入 kokkoro.yml 失败');
        })
        .finally(() => {
          bl.set(uin, bot);
          delegate.reply('登录成功');
        });
    })
    .login();
}

export async function startup() {
  process.title = 'kokkoro';

  let logined = false;
  const { bots } = getConfig();
  const { name, upday, version, changelogs } = require('../package.json');

  logger.mark(`----------`);
  logger.mark(`Package Version: ${name}@${version} (Released on ${upday})`);
  logger.mark(`View Changelogs：${changelogs}`);
  logger.mark(`----------`);
  logger.mark(`项目启动完成，开始登录账号`);

  for (const uin in bots) {
    const config = bots[uin];
    const qq = +uin;
    const bot = new Bot(qq, config);

    bl.set(qq, bot);

    if (!config.auto_login) continue;
    await bot
      .linkStart()
      .catch(error => { })
      .finally(() => { logined = true; })
  }

  if (logined) {
    emitter.emit('logined');
  } else {
    logger.info('当前无可登录的账号，请检查 kokkoro.yml 相关配置');
  }
}
