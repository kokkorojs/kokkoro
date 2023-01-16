import { resolve, isAbsolute, join } from 'path';
import { Client, Config, MessageRet } from 'oicq';
import { deepAssign, terminalInput } from '@kokkoro/utils';

import { getConfig } from '@/config';

const admins: number[] = [
  parseInt('84a11e2b', 16),
];
const botList: Map<number, Bot> = new Map();

export type PermissionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Protocol = Omit<Config, 'log_level'>;

/** bot 配置 */
export interface BotConfig {
  /** bot 账号 */
  uin: number;
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
  private masters: number[];
  private readonly password?: string;

  constructor(config: BotConfig) {
    const defaultConfig: Omit<BotConfig, 'uin'> = {
      auto_login: true,
      masters: [],
      protocol: {
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

    super(uin, {
      ...config.protocol,
      log_level: 'off',
    });

    this.log_level = getConfig('log_level')
    this.masters = config.masters!;
    this.password = config.password;

    this.once('system.online', () => {
      this.initEvents();
      this.sendMasterMsg('おはようございます、主様♪');
    });

    botList.set(uin, this);
  }

  /**
   * 重写 Client 方法
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

    while (true) {
      this.emit(name, data);
      this.logger.debug(`转发 ${name} 事件`);

      const i = name.lastIndexOf('.');

      if (i === -1) {
        break;
      }
      name = name.slice(0, i);
    }
  }

  /**
   * 给 bot 主人发送信息
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

  private initEvents(): void {
    this.on('system.online', this.onOnline);
    this.on('system.offline', this.onOffline);
  }

  private onOnline(): void {
    const message = '该账号刚刚从离线中恢复，现在一切正常';

    this.logger.mark(message);
    this.sendMasterMsg(message);
  }

  private onOffline(event: { message: string; }): void {
    this.logger.mark(`该账号已离线，${event.message}`);
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
