import { join } from 'path';
import { createHash } from 'crypto';
import { writeFile, readFile } from 'fs/promises';
import { Client, Config, DiscussMessageEvent, GroupMessageEvent, GroupRole, PrivateMessageEvent } from 'oicq';

// import plugin from './plugin';
// import { commandHanders } from './command';
import { logger, colors } from './util';
import { KOKKORO_UPDAY, KOKKORO_VERSION, KOKKORO_CHANGELOGS } from './help';

import { getGlobalConfig } from './config';
import { commandHanders, CommandType, parseCommand } from './command';

// 维护组 QQ
const admin = [2225151531];
// const data_dir = join(__workname, '/data/bots');

export interface KkrConfig {
  // 指令前缀，默认为 '>'
  prefix: string;
  // bot 主人
  master: number[];
  // 登录配置
  conf: Config;
}

export class Bot extends Client {
  readonly master: number[];
  readonly password_path: string;

  public prefix: string;

  constructor(uin: number, kconf?: KkrConfig) {
    const kkrconfig = {
      prefix: '>',
      master: [],
      ...kconf,
    }

    super(uin, kkrconfig.conf);

    this.prefix = kkrconfig.prefix;
    this.master = kkrconfig.master;
    this.password_path = join(this.dir, 'password');
    this.once('system.online', () => {
      this.bindMasterEvents();
      this.logger.info(`可给机器人发送 "${this.prefix}help" 查看指令帮助`);
    });
  }

  // 输入密码
  inputPassword() {
    this.logger.mark(`首次登录请输入密码：`);

    process.stdin.once('data', async data => {
      const input = String(data).trim();

      if (!input.length) return this.inputPassword();

      const password = createHash('md5').update(input).digest();

      await writeFile(this.password_path, password, { mode: 0o600 });
      this.login(password);
    })
  }

  async linkStart(password?: string) {
    if (password) {
      /**
       * 密码登录
       * 
       * 优点是一劳永逸
       * 缺点是需要过滑块，可能会报环境异常
       */
      this
        // 监听滑动验证码事件
        .on('system.login.slider', (event) => {
          this.logger.mark(`取 ticket 教程：https://github.com/takayama-lily/oicq/wiki/01.滑动验证码和设备锁`);

          process.stdout.write('ticket: ');
          process.stdin.once('data', this.submitSlider);
        })
        // 监听登录保护验证事件
        .on('system.login.device', () => {
          this.logger.mark('验证完成后拍回车键继续...');

          process.stdin.once('data', this.login);
        })
        .on('system.login.error', (event) => {
          const { message } = event;

          if (message.includes('密码错误')) {
            this.inputPassword();
          } else {
            this.terminate();
            this.logger.error(`${message}当前账号无法登录，拍回车键继续...`);

            process.stdin.once('data', () => { });
          }
        })

      try {
        const password = await readFile(this.password_path);
        this.login(password);
      } catch {
        this.inputPassword();
      }
    } else {
      /**
       * 扫描登录
       * 
       * 优点是不需要过滑块和设备锁
       * 缺点是万一 token 失效，无法自动登录，需要重新扫码
       */
      this
        .on('system.login.qrcode', (event) => {
          this.logger.mark('扫码完成后拍回车键继续...');

          process.stdin.once('data', this.login);
        })
        .on('system.login.error', (event) => {
          const { message } = event;

          this.terminate();
          this.logger.error(`${message}当前账号无法登录，拍回车键继续...`);

          process.stdin.once('data', () => { });
        })
        .login();
    }
  }

  /**
   *  level 0 群成员（随活跃度提升）
   *  level 1 群成员（随活跃度提升）
   *  level 2 群成员（随活跃度提升）
   *  level 3 管  理
   *  level 4 群  主
   *  level 5 主  人
   *  level 6 维护组
   */
  getUserLevel(event: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent) {
    const { sender } = event;
    const { user_id, level = 0, role = 'member' } = sender as { user_id: number, level?: number, role: GroupRole };

    let user_level;

    switch (true) {
      case admin.includes(user_id):
        user_level = 6
        break;
      case this.master.includes(user_id):
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

  sendMasterMsg(message: string) {
    for (const user_id of this.master) {
      this.sendPrivateMsg(user_id, `通知：\n　　${message}`)
    }
  }

  onOnline() {
    this.logger.info(`${this.nickname} 刚刚从掉线中恢复，现在一切正常`);
    this.sendMasterMsg(`通知：\n　　该账号刚刚从掉线中恢复，现在一切正常`);
  }

  onOffline(event: { message: string }) {
    const { message } = event;

    this.logger.info(`${this.nickname} 已离线，${message}`);
    this.sendMasterMsg(`通知：\n　　${this.uin} 已离线，${message}`);
  }

  async onMessage(event: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent) {
    let message;

    const { message_type, raw_message } = event;
    const user_level = this.getUserLevel(event);

    if (!raw_message.startsWith(this.prefix)) return;

    // 权限判断，群聊指令需要 level 3 以上，私聊指令需要 level 5 以上
    switch (message_type) {
      case 'group':
        if (user_level < 3) message = '权限不足';
        break;
      case 'private':
        if (user_level < 5) message = '权限不足';
        break;
    }

    if (message) return event.reply(message, true);

    const command = raw_message.replace(this.prefix, '');
    const { cmd, params } = parseCommand(command);

    for (const type of ['all', 'group', 'private'] as CommandType[]) {
      if (!commandHanders[type][cmd]) continue;

      this.logger.mark(`收到指令，正在处理: ${raw_message}`);

      if (message_type !== type && type !== 'all') {
        event.reply(`Error：指令 ${cmd} 不支持${message_type === 'private' ? '私聊' : '群聊'}`);
        return
      }

      message = await commandHanders[type][cmd].bind(this)(params, event);
      message ||= `Error：未知指令 "${cmd}"`;

      event.reply(message);
      this.logger.mark(`处理完毕，指令回复: ${message}`);
    }
  }

  bindMasterEvents() {
    this.removeAllListeners('system.login.slider');
    this.removeAllListeners('system.login.device');
    this.removeAllListeners('system.login.qrcode');
    this.removeAllListeners('system.login.error');

    this.on('message', this.onMessage);
    this.on('system.online', this.onOnline);
    this.on('system.offline', this.onOffline);
  }
}

// 所有机器人实例
const all_bot: Map<number, Bot> = new Map();

export function getBot(uin?: number) {
  return uin ? all_bot.get(uin) : all_bot;
}

// //#region createBot

// // 创建 bot
// async function createBot(uin: number, delegate: PrivateMessageEvent, parent: Client) {
//   const config: Config = {
//     platform: 5,
//     log_level: 'info',
//     data_dir: join(__workname, '/data/bots'),
//   };
//   const bot: Client = createClient(uin, config);

//   bot
//     .on("system.login.qrcode", function (event) {
//       const { image } = event;

//       delegate.reply([
//         `>登录流程：扫码完成后输入 "ok"\n>取消登录：输入 "cancel"\n`,
//         segment.image(image)
//       ]);

//       // 监听消息
//       parent.on("message.private", function listenLogin(event) {
//         if (event.from_id === delegate.from_id) {

//           const { raw_message } = event;

//           switch (raw_message) {
//             case 'ok':
//               bot.login();
//               this.off("message.private", listenLogin);
//               break;

//             case 'cancel':
//               bot.terminate();
//               delegate.reply(">登录流程：已取消");
//               break;
//           }
//         }
//       })
//     })
//     .on("system.login.error", function (data) {
//       this.terminate();
//       delegate.reply(`>登录流程遇到错误：${data.message}\n>登录已取消`);
//     })
//     .login();

//   return bot
// }

// //#endregion


// /**
//  * @description 指令消息监听
//  * @param this - bot 实例对象
//  * @param data - bot 接收到的消息对象
//  */

// async function bindMasterEvents(bot: Client) {
//   const { uin } = bot;

//   all_bot.set(uin, bot);
//   bot.removeAllListeners('system.login.slider');
//   bot.removeAllListeners('system.login.device');
//   bot.removeAllListeners('system.login.qrcode');
//   bot.removeAllListeners('system.login.error');
//   bot.on('message', onMessage);
//   bot.on('system.online', onOnline);
//   bot.on('system.offline', onOffline);

//   let number = 0;
//   const plugins = await plugin.restorePlugins(bot);

//   for (let [_, plugin] of plugins) {
//     if (plugin.binds.has(bot)) ++number;
//   }

//   setTimeout(() => {
//     const { bots } = getGlobalConfig();
//     const { prefix } = bots[uin];

//     broadcastOne(bot, `启动成功，启用了 ${number} 个插件，发送 "${prefix}help" 可以查询 bot 相关指令`);
//   }, 1000);
// }

export function startup() {
  // Acsii Font Name: Doh
  const wellcome: string = `———————————————————————————————————————————————————————————————————————————————————————————————————
                  _ _                            _          _         _    _
                 | | |                          | |        | |       | |  | |
    __      _____| | | ___ ___  _ __ ___   ___  | |_ ___   | | _____ | | _| | _____  _ __ ___
    \\ \\ /\\ / / _ \\ | |/ __/ _ \\| '_ \` _ \\ / _ \\ | __/ _ \\  | |/ / _ \\| |/ / |/ / _ \\| '__/ _ \\
     \\ V  V /  __/ | | (_| (_) | | | | | |  __/ | || (_) | |   < (_) |   <|   < (_) | | | (_) |
      \\_/\\_/ \\___|_|_|\\___\\___/|_| |_| |_|\\___|  \\__\\___/  |_|\\_\\___/|_|\\_\\_|\\_\\___/|_|  \\___/

———————————————————————————————————————————————————————————————————————————————————————————————————`;
  console.log(colors.cyan(wellcome))

  logger.mark(`----------`);
  logger.mark(`Package Version: kokkoro-core@${KOKKORO_VERSION} (Released on ${KOKKORO_UPDAY})`);
  logger.mark(`View Changelogs：${KOKKORO_CHANGELOGS}`);
  logger.mark(`----------`);
  logger.mark(`项目启动完成，开始登录账号`);

  process.title = 'kokkoro';

  const { bots } = getGlobalConfig();

  for (const uin in bots) {
    const { config, auto_login, login_mode } = bots[uin];
    const uin_num = Number(uin);
    const bot = new Bot(uin_num, config);

    all_bot.set(uin_num, bot);

    if (!auto_login) continue;
    if (!all_bot.size) logger.info(`当前无可登录的账号，请检查是否开启 auto_login`);

    bot.linkStart(login_mode);
  }
}

// export {
//   linkStart, getBot, getAllBot, createBot, bindMasterEvents,
// }