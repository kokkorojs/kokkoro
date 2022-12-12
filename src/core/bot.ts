import { deepMerge } from '@kokkoro/utils';
import { resolve, isAbsolute } from 'path';
import { Client, Config, GroupRole, MessageRet } from 'oicq';

import { logger } from '@/kokkoro';
import { BotEvent } from '@/events';
import { getPluginMap, Option } from '@/plugin';
import { getConfig, Profile, Setting } from '@/config';

const admins: number[] = [
  parseInt('84a11e2b', 16),
];
const botMap: Map<number, Bot> = new Map();

export type PermissionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Protocol = Omit<Config, 'log_level'>;

export interface BotConfig {
  /** 自动登录，默认 true */
  auto_login?: boolean;
  /** 登录密码，为空则扫码登录 */
  password?: string;
  /** bot 主人 */
  masters?: number[];
  /** 协议配置 */
  protocol?: Protocol;
}

export class Bot extends Client {
  private profile: Profile;
  private masters: number[];
  private readonly password?: string;

  constructor(uin: number, config?: BotConfig) {
    const defaultConfig: BotConfig = {
      auto_login: true,
      masters: [],
      protocol: {
        data_dir: 'data/bot',
      },
    };
    config = deepMerge(defaultConfig, config);

    const { protocol } = config;
    const { data_dir } = protocol!;

    // 转换绝对路径
    protocol!.data_dir = isAbsolute(data_dir!) ? data_dir : resolve(data_dir!);

    super(uin, {
      ...config.protocol,
      log_level: getConfig('log_level'),
    });
    botMap.set(uin, this);

    this.profile = new Profile(this);
    this.masters = config.masters!;
    this.password = config.password;

    this.once('system.online', () => {
      this.initEvents();
      this.sendMasterMsg('おはようございます、主様♪');
    });

    logger.debug('created bot');
  }

  /**
   * 重写 Client 方法
   * 
   * @param name - 事件名
   * @param data - 事件 event 对象
   */
  public em(name = '', data?: any) {
    data = Object.defineProperty(data || {}, 'self_id', {
      value: this.uin,
      writable: true,
      enumerable: true,
      configurable: true,
    });

    while (true) {
      const pluginMap = getPluginMap();

      pluginMap.forEach((plugin) => {
        plugin.emit('plugin.message', {
          name, data,
        });
      });
      this.emit(name, data);

      const i = name.lastIndexOf('.');

      if (i === -1) {
        break;
      }
      name = name.slice(0, i);
    }
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
   * @returns 权限等级
   */
  public getPermissionLevel(event: BotEvent<'message'>): PermissionLevel {
    let role: GroupRole = 'member';
    let level: number = 0;
    let user_id: number = event.sender.user_id;

    if (event.message_type === 'group') {
      const { sender } = event;

      role = sender.role;
      level = sender.level;
    }
    let permission_level: PermissionLevel;

    switch (true) {
      case admins.includes(user_id):
        permission_level = 6;
        break;
      case this.masters.includes(user_id):
        permission_level = 5;
        break;
      case role === 'owner':
        permission_level = 4;
        break;
      case role === 'admin':
        permission_level = 3;
        break;
      case level > 4:
        permission_level = 2;
        break;
      case level > 2:
        permission_level = 1;
        break;
      default:
        permission_level = 0;
        break;
    }
    return permission_level;
  }

  /**
   * 获取群插件设置
   * 
   * @param group_id - 群号
   * @returns 群插件设置
   */
  getSetting(group_id: number): Setting {
    return this.profile.getSetting(group_id);
  }

  /**
   * 获取群插件配置项
   * 
   * @param group_id - 群号
   * @param name - 插件名
   * @returns 群插件配置项
   */
  getOption(group_id: number, name: string): Option {
    return this.profile.getOption(group_id, name);
  }

  /**
   * 获取 bot 插件禁用列表
   * 
   * @returns 
   */
  getDisable(): string[] {
    return this.profile.getDisable();
  }

  enablePlugin(name: string) {
    return this.profile.enablePlugin(name);
  }

  disablePlugin(name: string) {
    return this.profile.disablePlugin(name);
  }

  /**
   * 修改当前 bot 插件配置项
   * 
   * @param group_id - 群号
   * @param plugin - 插件名
   * @param key - option 名
   * @param value - 值
   * @returns 是否修改成功
   */
  updateOption(group_id: number, plugin: string, key: string, value: string | number | boolean) {
    return this.profile.updateOption(group_id, plugin, key, value);
  }

  /**
   * 给 bot 主人发送信息
   *
   * @param message - 通知信息
   * @returns 发消息的返回值
   */
  public sendMasterMsg(message: string): Promise<MessageRet[]> {
    const queue: Promise<MessageRet>[] = [];

    for (const uin of this.masters) {
      queue.push(this.sendPrivateMsg(uin, message));
    }
    return Promise.all(queue);
  }

  /**
   * 查询用户是否为 master
   *
   * @param user_id - 用户 id
   * @returns 查询结果
   */
  public isMaster(user_id: number): boolean {
    return this.masters.includes(user_id);
  }

  /**
   * 查询用户是否为 admin
   *
   * @param user_id - 用户 id
   * @returns 查询结果
   */
  public isAdmin(user_id: number): boolean {
    return admins.includes(user_id);
  }

  private initEvents() {
    this.emit('bot.profile.refresh');

    this.removeAllListeners('system.login.slider');
    this.removeAllListeners('system.login.device');
    this.removeAllListeners('system.login.qrcode');

    this.on('system.online', this.onOnline);
    this.on('system.offline', this.onOffline);
  }

  private onOnline(): void {
    this.emit('bot.profile.refresh');
    this.sendMasterMsg('该账号刚刚从离线中恢复，现在一切正常');
    this.logger.mark(`${this.nickname} 刚刚从离线中恢复，现在一切正常`);
  }

  private onOffline(event: { message: string; }): void {
    this.logger.mark(`${this.nickname} 已离线，${event.message}`);
  }

  /**
   * 账号登录
   */
  public async linkStart() {
    this.password ? this.passwordLink() : this.qrcodeLink();
    this.login(this.password);

    await new Promise<void>((resolve, reject) => {
      this
        .once('system.online', () => resolve())
        .once('system.login.error', (event) => reject(event.message))
    })
  }

  /**
   * 扫描登录
   *
   * 优点是不需要过滑块和设备锁
   * 缺点是万一 token 失效，无法自动登录，需要重新扫码
   */
  private qrcodeLink() {
    this
      .on('system.login.qrcode', () => {
        // 扫码轮询
        const interval_id = setInterval(async () => {
          const { retcode } = await this.queryQrcodeResult();

          // 0: 扫码完成 48: 未确认 53: 取消扫码
          if (retcode === 0 || ![48, 53].includes(retcode)) {
            clearInterval(interval_id);
            this.login();
          }
        }, 500);

        this.logger.mark('扫码完成后将会自动登录，按回车键可刷新二维码');
        process.stdin.once('data', () => {
          this.login();
        });
      })
  }

  /**
   * 密码登录
   *
   * 优点是一劳永逸
   * 缺点是需要过滑块，可能会报环境异常
   */
  private passwordLink() {
    this
      .on('system.login.slider', () => {
        this.logger.mark('取 ticket 教程: https://github.com/takayama-lily/oicq/wiki/01.滑动验证码和设备锁');
        process.stdout.write('请输入 ticket: ');
        process.stdin.once('data', (event: string) => {
          this.submitSlider(event.trim());
        });
      })
      .on('system.login.device', () => {
        // TODO ／人◕ ‿‿ ◕人＼ 设备锁轮询，oicq 暂无相关 func
        this.logger.mark('输入密保手机收到的短信验证码后按回车键继续');
        this.sendSmsCode();
        process.stdin.once('data', (event: string) => {
          this.submitSmsCode(event);
        });
      })
  }
}

/**
 * 获取机器人对象
 * 
 * @returns 
 */
export function getBotMap() {
  return botMap;
}

/**
 * 创建 bot
 * 
 * @param uin - 账号
 * @param config - 配置
 * @returns 机器人实例
 */
export function createBot(uin: number, config?: BotConfig) {
  return new Bot(uin, config);
}
