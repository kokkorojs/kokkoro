import jsqr from 'jsqr';
import { PNG } from 'pngjs';
import { deepAssign } from '@kokkoro/utils';
import { resolve, isAbsolute, join } from 'path';
import { Client, Config, GroupRole, MessageRet } from 'oicq';

import { Profile } from '@/core';
import { Context } from '@/types';
import { getPluginList } from '@/plugin';

// TODO ／人◕ ‿‿ ◕人＼ 维护组联系方式，目前没什么用（just yuki）
const admins: number[] = [
  parseInt('84a11e2b', 16),
];
const botList: Map<number, Bot> = new Map();

export type PermissionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** bot 配置 */
export interface BotConfig {
  /** bot 账号 */
  uin: number;
  /** 自动登录，默认 true */
  // auto_login?: boolean;
  /** 登录密码，为空则扫码登录 */
  password?: string;
  /** bot 主人 */
  masters?: number[];
  /** 协议配置 */
  protocol?: Config;
}

export class Bot extends Client {
  public masters: number[];
  public password?: string;
  public profile: Profile;

  constructor(config: BotConfig) {
    const defaultConfig: Omit<BotConfig, 'uin'> = {
      // auto_login: true,
      masters: [],
      protocol: {
        log_level: 'info',
        // 默认 ipad 防止 android 被挤下线
        platform: 5,
        data_dir: join(__dataname, 'bot'),
      },
    };

    config = deepAssign(defaultConfig, config) as BotConfig;

    const { uin, protocol } = config;
    const { data_dir } = protocol!;

    // 转换绝对路径
    protocol!.data_dir = isAbsolute(data_dir!) ? data_dir : resolve(data_dir!);

    super(uin, config.protocol);

    this.masters = config.masters!;
    this.password = config.password;
    this.profile = new Profile(this);

    this.once('system.online', () => {
      this.initEvents();
      this.sendMasterMsg('おはようございます、主様♪');
    });

    botList.set(uin, this);
  }

  /**
   * 重写 Client 方法。
   * 
   * @param name - 事件名
   * @param data - 事件对象
   */
  public em(name = '', data?: any) {
    data = Object.defineProperty(data || {}, 'self_id', {
      value: this.uin,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    const pl = getPluginList();

    while (true) {
      this.emit(name, data);
      this.logger.debug(`转发 ${name} 事件`);

      pl.forEach((plugin) => {
        plugin.emit('plugin.message', {
          name, data,
        });
      });

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
   * @param context - 消息上下文
   * @returns 权限等级
   */
  public getPermissionLevel(context: Context<'message'>): PermissionLevel {
    let role: GroupRole = 'member';
    let level: number = 0;
    let user_id: number = context.sender.user_id;

    if (context.message_type === 'group') {
      const { sender } = context;

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
   * 给 bot 主人发送信息。
   * 
   * @param message - 通知信息
   * @returns 发消息的返回值
   */
  public sendMasterMsg(message: string): Promise<PromiseSettledResult<MessageRet>[]> {
    const queue: Promise<MessageRet>[] = [];

    for (const uin of this.masters) {
      queue.push(this.sendPrivateMsg(uin, message));
    }
    return Promise.allSettled(queue);
  }

  /**
   * 查询用户是否为 master。
   *
   * @param user_id - 用户 id
   * @returns 查询结果
   */
  public isMaster(user_id: number): boolean {
    return this.masters.includes(user_id);
  }

  /**
   * 查询用户是否为 admin。
   *
   * @param user_id - 用户 id
   * @returns 查询结果
   */
  public isAdmin(user_id: number): boolean {
    return admins.includes(user_id);
  }

  public async linkStart() {
    const result: Record<string, any> = {};
    const QRCodeEventListen = (event: { image: Buffer; }) => {
      const { data, width, height } = PNG.sync.read(event.image);
      const { data: url } = jsqr(new Uint8ClampedArray(data), width, height)!;

      result.data = {
        status: 1,
        url,
      };

      this.emit('bot.link');
    };
    const onlineEventListen = () => {
      result.data = {
        status: 0,
      };

      this.emit('bot.link');
    };

    this.on('system.online', onlineEventListen);
    this.on('system.login.qrcode', QRCodeEventListen);
    this.login(this.password);

    await new Promise<void>((resolve) => {
      this.on('bot.link', () => {
        this.off('system.online', onlineEventListen);
        this.off('system.login.qrcode', QRCodeEventListen);
        resolve();
      });
    });
    return result;
  }

  private initEvents(): void {
    this.profile.refreshData();
    this.on('system.online', this.onOnline);
    this.on('system.offline', this.onOffline);
  }

  private onOnline(): void {
    const message = '该账号刚刚从离线中恢复，现在一切正常';

    this.logger.info(message);
    this.profile.refreshData();
    this.sendMasterMsg(message);
  }

  private onOffline(event: { message: string; }): void {
    this.logger.info(`该账号已离线，${event.message}`);
  }
}

/**
 * 获取机器人对象
 * 
 * @returns 
 */
export function getBotList(): Map<number, Bot> {
  return botList;
}
