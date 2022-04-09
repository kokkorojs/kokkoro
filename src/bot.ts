
import { join } from 'path';
import { createHash } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import { Client, Config as Protocol, GroupRole, MemberIncreaseEvent, MemberDecreaseEvent, PrivateMessageEvent } from 'oicq';

import { getConfig, setBotConfig } from './config';
import { emitter, AllMessageEvent } from './events';
import { importAllExtension, extension, getExtensionList } from './extension';
import { initSetting, Setting, writeSetting } from './setting';
import { logger, deepMerge, section, deepClone } from './util';
import { KOKKORO_VERSION, KOKKORO_UPDAY, KOKKORO_CHANGELOGS } from '.';

const admins: Set<number> = new Set([
  parseInt('84a11e2b', 16),
]);
const bot_list: Map<number, Bot> = new Map();

// 登录终了
emitter.once('kokkoro.logined', () => {
  // 导入扩展模块
  importAllExtension()
    .then(async extension_list => {
      logger.mark(`加载了${extension_list.size}个扩展`);

      for (const [uin, bot] of bot_list) {
        try {
          // 初始化 setting.json
          const setting = await initSetting(uin);

          // 恢复绑定 extensions
          for (let i = 0; i < setting.extensions.length; i++) {
            const name = setting.extensions[i];
            const extension = extension_list.get(name)?.bindBot(bot);

            // 更新 group setting
            if (extension) {
              const group_list = bot.getGroupList();

              // 校验 option
              for (const [group_id, group_info] of group_list) {
                const { group_name } = group_info;

                setting[group_id] ||= {
                  name: group_name, extension: {},
                };

                if (setting[group_id].name !== group_name) {
                  setting[group_id].name = group_name;
                }
                const option = setting[group_id].extension[name];

                setting[group_id].extension[name] = deepMerge(extension.getOption(), option);
              }
            } else {
              // 移除当前不存在的扩展 name
              if (setting.extensions.length >= 1) {
                setting.extensions.splice(i, 1), i--;
              }
              logger.error(`"${name}" import module failed, extension is undefined`);
            }
          }
          await bot.setSetting(setting);
        } catch (error) {
          throw error;
        }
      }
    })
    .catch(error => {
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
    deepMerge(default_config, config);

    super(uin, default_config.protocol);

    this.mode = default_config.mode!;
    this.masters = new Set(default_config.masters);
    this.password_path = join(this.dir, 'password');

    this.once('system.online', () => {
      extension.bindBot(this);

      this.bindEvents();
      this.sendMasterMsg('おはようございます、主様♪');
    });
  }

  linkStart(): Promise<void> {
    return new Promise(async (resolve, reject) => {
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
    const { user_id, level = 0, role = 'member' } = sender as { user_id: number, level?: number, role?: GroupRole };

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
    await writeSetting(this.uin, setting)
      .then(() => {
        this.setting = setting;
        this.logger.mark('已更新 setting.yml');
      })
      .catch(error => {
        this.logger.error(`更新写入 setting.yml 失败，${error.message}`);
      })
  }

  getSetting() {
    return deepClone(this.setting);
  }

  updateExtensionsSetting(extensions: string[]): Promise<void> {
    const old_setting = this.getSetting();

    return new Promise((resolve, reject) => {
      this.setting.extensions = extensions;

      writeSetting(this.uin, this.setting)
        .then(() => {
          resolve();
        })
        .catch(error => {
          // TODO ⎛⎝≥⏝⏝≤⎛⎝ 数据回滚
          this.setting = old_setting;
          reject(error);
        })
    })
  }

  getOption(group_id: number) {
    return deepClone(this.setting[group_id].extension);
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

  private bindEvents(): void {
    this.removeAllListeners('system.login.slider');
    this.removeAllListeners('system.login.device');
    this.removeAllListeners('system.login.qrcode');
    this.removeAllListeners('system.login.error');

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

  private onGroupIncrease(event: MemberIncreaseEvent): void {
    if (event.user_id !== this.uin) return;

    const setting = this.getSetting();
    const group_list = this.getGroupList();
    const extension_list = getExtensionList();

    for (const name of setting.extensions) {
      const extension = extension_list.get(name)!;

      for (const [group_id, group_info] of group_list) {
        const { group_name } = group_info;

        setting[group_id] ||= {
          name: group_name, extension: {},
        };

        if (setting[group_id].name !== group_name) {
          setting[group_id].name = group_name;
        }
        setting[group_id].extension[name] = extension.getOption();
      }
    }
    this.setSetting(setting);
  }

  private onGroupDecrease(event: MemberDecreaseEvent): void {
    if (event.user_id !== this.uin) return;

    const group_id = event.group_id;
    const setting = this.getSetting();

    delete setting[group_id];
    this.setSetting(setting);
  }
}
export function getBot(uin: number): Bot | undefined {
  return bot_list.get(uin);
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
        section.image(event.image),
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
          bot.logger.mark('写入 kokkoro.yml 成功');
        })
        .catch(() => {
          bot.logger.error('写入 kokkoro.yml 失败');
        })
        .finally(() => {
          bot_list.set(uin, bot);
          private_event.reply('登录成功');
          // TODO ⎛⎝≥⏝⏝≤⎛⎝ 绑定扩展 bindAllExtension & setting 更新
        });
    })
    .login();
}

export async function startup() {
  process.title = 'kokkoro';

  let logined = false;
  const bots = getConfig().bots;

  logger.mark(`----------`);
  logger.mark(`Package Version: kokkoro@${KOKKORO_VERSION} (Released on ${KOKKORO_UPDAY})`);
  logger.mark(`View Changelogs: ${KOKKORO_CHANGELOGS}`);
  logger.mark(`----------`);
  logger.mark(`项目启动完成，开始登录账号`);

  for (const uin in bots) {
    const config = bots[uin];
    const qq = +uin;
    const bot = new Bot(qq, config);

    bot_list.set(qq, bot);

    if (!config.auto_login) continue;
    await bot
      .linkStart()
      .catch(error => { })
      .finally(() => { logined = true; })
  }

  if (logined) {
    emitter.emit('kokkoro.logined');
  } else {
    logger.info('当前无可登录的账号，请检查 kokkoro.yml 相关配置');
  }
}
