import { join } from 'path';
import { createHash } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import { Client, Config as Protocol, MemberDecreaseEvent, MemberIncreaseEvent, PrivateMessageEvent, segment } from 'oicq';

import { logger, deepMerge } from './util';
import { emitter, AllMessageEvent } from './events';
import { getGlobalConfig, setBotConfig } from './config';
import { initSetting, Setting, writeSetting } from './setting';
import { KOKKORO_VERSION, KOKKORO_UPDAY, KOKKORO_CHANGELOGS } from '.';
import { importAllPlugin, bindBot, getPlugin, extension } from './plugin';

const admins: Set<number> = new Set([
  parseInt('84a11e2b', 16),
]);
const bot_list: Map<number, Bot> = new Map();

// 登录终了
emitter.once('kokkoro.logined', () => {
  // 导入插件模块
  importAllPlugin()
    .then(async plugin_list => {
      logger.mark(`加载了${plugin_list.size}个插件`);

      for (const [uin, bot] of bot_list) {
        const setting = await initSetting(uin);
        const plugins = setting.plugins;

        // 恢复绑定 plugins
        for (let i = 0; i < plugins.length; i++) {
          const name = plugins[i];

          await bindBot(name, uin).catch(error => {
            logger.error(`import module failed, ${error.message}`);
          })
        }
        await bot.setSetting(setting);
      }
    })
    .catch(error => {
      /**
       * 如果在这里就报错，项目不应该继续执行下去
       * 抛出异常多半是由于权限不足导致的本地文件读写失败，不做 catch 处理
       */
      throw error;
    })
});

export type UserLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

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
  private mode: string;
  private setting!: Setting;
  private masters: Set<number>;
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
    config = deepMerge(default_config, config) as Config;

    super(uin, config.protocol);

    this.mode = config.mode!;
    this.masters = new Set(config.masters);
    this.password_path = join(this.dir, 'password');

    this.once('system.online', () => {
      extension.bindBot(this);

      this.bindEvents();
      this.sendMasterMsg('おはようございます、主様♪');
    });
  }

  linkStart(): Promise<void> {
    return new Promise((resolve, reject) => {
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
              // 扫码轮询
              const interval_id = setInterval(async () => {
                const { retcode } = await this.queryQrcodeResult();

                /**
                 * 0   扫码完成
                 * 48  扫码中（已扫未确认）
                 * 53  扫码取消
                 */
                if (retcode === 0 || ![48, 53].includes(retcode)) {
                  this.login();
                  clearInterval(interval_id);
                }
              }, 2000);
            })
            .once('system.login.error', (event: { code: number; message: string; }) => {
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
              this.logger.mark('取 ticket 教程: https://github.com/takayama-lily/oicq/wiki/01.滑动验证码和设备锁');

              process.stdout.write('请输入 ticket : ');
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
            .once('system.login.error', (event) => {
              const { message } = event;

              if (message.includes('密码错误')) {
                this.inputPassword();
              } else {
                this.terminate();
                this.logger.error(`当前账号无法登录，${message}`);
                reject(new Error(message));
              }
            });

          readFile(this.password_path)
            .then(password => this.login(password))
            .catch(() => this.inputPassword())
          break;
        default:
          this.terminate();
          this.logger.error(`你他喵的 "login_mode" 改错了 (ㅍ_ㅍ)`);
          reject(new Error('invalid mode'));
      }
      this.once('system.online', () => resolve());
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
   * @param {AllMessageEvent} event - 消息 event
   * @returns {number} 用户等级
   */
  getUserLevel(event: AllMessageEvent): UserLevel {
    const { sender } = event;
    const { user_id, level = 0, role = 'member' } = sender as any;

    let user_level: UserLevel;

    switch (true) {
      case admins.has(user_id):
        user_level = 6
        break;
      case this.masters.has(user_id):
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

  async setSetting(setting: Setting) {
    await writeSetting(this.uin)
      .then(rewrite => {
        this.setting = setting;

        if (rewrite) {
          this.logger.mark('已更新 setting.yml');
        }
      })
      .catch(error => {
        this.logger.error(`更新写入 setting.yml 失败，${error.message}`);
      })
  }

  getSetting() {
    return this.setting;
  }

  getOption(group_id: number, name: string) {
    return this.setting[group_id].plugin[name];
  }

  isMaster(user_id: number): boolean {
    return this.masters.has(user_id);
  }

  isAdmin(user_id: number): boolean {
    return admins.has(user_id);
  }

  /**
   * 给 bot 主人发送信息
   * 
   * @param {string} message - 通知信息 
   */
  private sendMasterMsg(message: string): void {
    for (const uin of this.masters) {
      this.sendPrivateMsg(uin, message);
    }
  }

  private inputPassword(): void {
    process.stdin.setEncoding('utf8');
    process.stdout.write('首次登录请输入密码: ');
    process.stdin.once('data', (password: string) => {
      password = password.trim();

      if (!password.length) return this.inputPassword();

      const password_md5 = createHash('md5').update(password).digest();

      writeFile(this.password_path, password_md5, { mode: 0o600 })
        .then(() => { this.logger.mark('写入 password md5 成功'); })
        .catch(error => { this.logger.error(`写入 password md5 失败，${error.message}`); })
        .finally(() => { this.login(password_md5); });
    })
  }

  private bindEvents(): void {
    this.removeAllListeners('system.login.slider');
    this.removeAllListeners('system.login.device');
    this.removeAllListeners('system.login.qrcode');

    this.on('system.online', this.onOnline);
    this.on('system.offline', this.onOffline);
    this.on('notice.group.increase', this.onGroupIncrease);
    this.on('notice.group.decrease', this.onGroupDecrease);
  }

  private onOnline(): void {
    this.sendMasterMsg('该账号刚刚从离线中恢复，现在一切正常');
    this.logger.mark(`${this.nickname} 刚刚从离线中恢复，现在一切正常`);
  }

  private onOffline(event: { message: string }): void {
    this.logger.mark(`${this.nickname} 已离线，${event.message}`);
  }

  private async onGroupIncrease(event: MemberIncreaseEvent): Promise<void> {
    if (event.user_id !== this.uin) return;

    const setting = this.getSetting();
    const group_id = event.group_id;
    const group_name = (await this.getGroupInfo(group_id)).group_name;

    setting[group_id] ||= {
      name: group_name, plugin: {},
    };

    if (setting[group_id].name !== group_name) {
      setting[group_id].name = group_name;
    }
    for (const name of setting.plugins) {
      try {
        const plugin = await getPlugin(name);
        const default_option = plugin.getOption();
        const local_option = setting[group_id].plugin[name];
        const option = deepMerge(default_option, local_option);

        setting[group_id].plugin[name] = option;
      } catch (error) {
        this.logger.error((error as Error).message);
      }
    }
    writeSetting(this.uin)
      .then(() => {
        this.logger.info(`更新了群配置，新增了群：${group_id}`);
      })
      .catch(error => {
        this.logger.error(`群配置失败，${error.message}`);
      })
  }

  private onGroupDecrease(event: MemberDecreaseEvent): void {
    if (event.user_id !== this.uin) return;

    const group_id = event.group_id;
    const setting = this.getSetting();

    delete setting[group_id];
    writeSetting(this.uin)
      .then(() => {
        this.logger.info(`更新了群配置，删除了群：${group_id}`);
      })
      .catch(error => {
        this.logger.error(`群配置失败，${error.message}`);
      })
  }
}

export async function getBot(uin: number): Promise<Bot> {
  if (!bot_list.has(uin)) {
    throw new Error(`bot "${uin}" is undefined`);
  }
  return bot_list.get(uin)!;
}

export function getBotList(): Map<number, Bot> {
  return bot_list;
}

/**
 * 添加一个新的 bot 并登录
 *
 * @param {Bot} this - 被私聊的 bot 对象
 * @param {number} uin - 添加的 uin
 * @param {PrivateMessageEvent} private_event 私聊消息 event
 */
export function addBot(this: Bot, uin: number, private_event: PrivateMessageEvent) {
  const config: Config = {
    auto_login: true,
    mode: 'qrcode',
    masters: [private_event.sender.user_id],
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
      private_event.reply([
        segment.image(event.image),
        '\n使用手机 QQ 扫码登录，输入 “cancel” 取消登录',
      ]);

      const listenLogin = (event: PrivateMessageEvent) => {
        if (event.sender.user_id === private_event.sender.user_id && event.raw_message === 'cancel') {
          bot.terminate();
          clearInterval(interval_id);
          private_event.reply('登录已取消');
        }
      }
      const interval_id = setInterval(async () => {
        const { retcode } = await bot.queryQrcodeResult();

        if (retcode === 0 || ![48, 53].includes(retcode)) {
          bot.login();
          clearInterval(interval_id);
          retcode && private_event.reply(`Error: 错误代码 ${retcode}`);
          this.off('message.private', listenLogin);
        }
      }, 2000);

      this.on('message.private', listenLogin)
    })
    .once('system.login.error', data => {
      this.terminate();
      private_event.reply(`Error: ${data.message}`);
    })
    .once('system.online', () => {
      setBotConfig(uin, config)
        .then(() => {
          bot.logger.info('写入 kokkoro.yml 成功');
        })
        .catch(() => {
          bot.logger.error('写入 kokkoro.yml 失败');
        })
        .finally(async () => {
          try {
            const setting = await initSetting(uin);
            const plugins = setting.plugins;

            bot_list.set(uin, bot);
            private_event.reply('登录成功');

            // 绑定插件
            for (let i = 0; i < plugins.length; i++) {
              await bindBot(plugins[i], uin);
            }
            await bot.setSetting(setting);
          } catch (error) {
            const { message } = error as Error;

            logger.error(message);
            private_event.reply(message);
          }
        });
    })
    .login();
}

export async function startup() {
  process.title = 'kokkoro';

  let logined = false;
  const { bots } = getGlobalConfig();

  logger.mark(`----------`);
  logger.mark(`Package Version: kokkoro@${KOKKORO_VERSION} (Released on ${KOKKORO_UPDAY})`);
  logger.mark(`View Changelogs: ${KOKKORO_CHANGELOGS}`);
  logger.mark(`----------`);
  logger.mark(`项目启动完成，开始登录账号`);

  for (const uin in bots) {
    const config = bots[uin];
    const bot = new Bot(+uin, config);

    bot_list.set(bot.uin, bot);

    if (!config.auto_login) continue;

    await bot.linkStart()
      .then(() => { logined = true; })
      .catch(error => { bot.logger.error(error.message); })
  }

  if (logined) {
    emitter.emit('kokkoro.logined');
  } else {
    logger.info('当前无可登录的账号，请检查 kokkoro.yml 相关配置');
  }
}
