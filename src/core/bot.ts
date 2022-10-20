import { join } from 'path';
import { createHash } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import { parentPort, MessagePort, TransferListItem } from 'worker_threads';
import { Client, Config as Protocol, GroupRole, MessageRet } from 'oicq';

// import { PortEventMap } from '../events';
// import { getSetting, Setting, writeSetting } from '../profile/setting';

import { deepMerge } from '@/utils';
import { AllMessage, BotEventMap } from '@/events';
import { Profile, UpdateSettingEvent } from '@/config';
import { BotLinkChannelEvent, PluginMessagePort } from '@/worker';
import { BindListenEvent } from '@/plugin';

interface ApiTriggerEvent {
  method: keyof Client;
  params: unknown[];
}

enum Platform {
  Android = 1,
  aPad,
  Watch,
  Mac,
  iPad,
}

/** bot 消息 */
export interface BotMessage {
  name: keyof BotEventMap;
  event: any;
}

export type BotPostMessage =
  {
    name: 'thread.process.stdin';
    event?: string;
  }

interface BotPort extends MessagePort {
  postMessage(message: BotPostMessage, transferList?: ReadonlyArray<TransferListItem>): void;

  addListener<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this;
  emit<T extends keyof BotEventMap>(event: T, ...args: Parameters<BotEventMap<this>[T]>): boolean;
  on<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this
  once<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this
  prependListener<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this
  prependOnceListener<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this
  removeListener<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this
  off<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this
}

export type UserLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface BotConfig {
  /** 自动登录，默认 true */
  auto_login?: boolean;
  /** 登录模式，默认 qrcode */
  mode: 'qrcode' | 'password';
  /** bot 主人 */
  masters?: number[];
  /** 协议配置 */
  protocol?: Protocol;
}

const admins: number[] = [
  parseInt('84a11e2b', 16),
];
const data_dir: string = join(__dataname, 'bot');
const botPort: BotPort = parentPort as BotPort;

export class Bot extends Client {
  private masters: number[];
  private profile: Profile;
  private pluginPort: Map<string, PluginMessagePort>;
  private readonly mode: 'qrcode' | 'password';
  private readonly password_path: string;

  constructor(uin: number, config?: BotConfig) {
    const default_config: BotConfig = {
      auto_login: true,
      masters: [],
      mode: 'qrcode',
      protocol: {
        data_dir,
      },
    };
    config = deepMerge(default_config, config);

    super(uin, config.protocol);

    this.masters = [];
    this.mode = config.mode;
    this.profile = new Profile(this);
    this.pluginPort = new Map();
    this.password_path = join(this.dir, 'password');

    this.proxyBotPortEvents();
    this.bindBotPortEvents();
    this.once('system.online', this.onFirstOnline);
  }

  private proxyBotPortEvents() {
    botPort.on('close', () => {
      botPort.emit('bot.close');
    });
    botPort.on('message', (value) => {
      botPort.emit('bot.message', value);
    });
    botPort.on('messageerror', (error) => {
      botPort.emit('bot.messageerror', error);
    });
  }

  private bindBotPortEvents() {
    botPort.on('bot.close', () => this.onClose());
    botPort.on('bot.message', (event) => this.onMessage(event));
    botPort.on('bot.messageerror', (event) => this.onMessageError(event));
    botPort.on('bot.link.channel', (event) => this.onLinkChannel(event));
  }

  private onClose() {
    this.logger.info('通道已关闭');
  }

  private onMessage(message: BotMessage) {
    if (!message.name) {
      throw new Error('message error');
    }
    botPort.emit(message.name, message.event);
    this.logger.debug(`bot 线程收到消息:`, message);
  }

  private onMessageError(error: Error) {
    this.logger.error('反序列化消息失败:', error.message);
  }

  private onLinkChannel(event: BotLinkChannelEvent) {
    const { name, port } = event;

    // 线程事件代理
    port.on('message', (message) => {
      if (message.name) {
        port.emit(message.name, message.event);
      }
      this.logger.debug('bot 收到了消息:', message);
    });

    this.listenPortEvents(port);
    this.pluginPort.set(name, port);
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

            botPort.once('thread.process.stdout', () => {
              this.login();
            });
            botPort.postMessage({
              name: 'thread.process.stdin',
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

    botPort.once('thread.process.stdout', (content) => {
      this.submitSlider(content);
    });
    botPort.postMessage({
      name: 'thread.process.stdin',
      event: '请输入 ticket: ',
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
   * @param event - 群聊/私聊消息
   * @returns 用户等级
   */
  private getUserLevel(event: AllMessage): UserLevel {
    let level: number = 0;
    let role: GroupRole = 'member';
    let user_id: number = event.sender.user_id;

    if (event.message_type === 'group') {
      const { sender } = event;

      level = sender.level;
      role = sender.role;
    }
    let user_level: UserLevel;

    switch (true) {
      case admins.includes(user_id):
        user_level = 6;
        break;
      case this.masters.includes(user_id):
        user_level = 5;
        break;
      case role === 'owner':
        user_level = 4;
        break;
      case role === 'admin':
        user_level = 3;
        break;
      case level > 4:
        user_level = 2;
        break;
      case level > 2:
        user_level = 1;
        break;
      default:
        user_level = 0;
        break;
    }
    return user_level;
  }

  private inputPassword(): void {
    botPort.once('thread.process.stdout', (content) => {
      if (!content.length) {
        return this.inputPassword();
      }
      const password = createHash('md5').update(content).digest();

      writeFile(this.password_path, password, { mode: 0o600 })
        .then(() => this.logger.mark('写入 password md5 成功'))
        .catch(error => this.logger.error(`写入 password md5 失败，${error.message}`))
        .finally(() => this.login(password));
    });
    botPort.postMessage({
      name: 'thread.process.stdin',
      event: '首次登录请输入密码: ',
    });
  }

  // 监听主线程端口事件
  private listenPortEvents(port: PluginMessagePort) {
    port.on('bot.bind.setting', (event) => this.onBindSetting(event));
    port.on('bot.bind.event', (event) => this.onBindEvent(event, port));
    port.on('bot.api.trigger', (event) => this.onApiTrigger(event, port));
  }

  // 绑定插件配置
  private onBindSetting(event: UpdateSettingEvent) {
    if (!this.isOnline()) {
      this.once('system.online', () => {
        this.emit('config.update.setting', event);
      })
    }
  }

  // 绑定插件事件
  private onBindEvent(event: BindListenEvent, port: PluginMessagePort) {
    const { name, listen } = event;

    this.on(listen, (e: any) => {
      for (const key in e) {
        if (typeof e[key] === 'function') delete e[key];
      }

      if (listen.startsWith('message')) {
        e.permission_level = this.getUserLevel(e);
      }
      if (e.message_type === 'group') {
        e.setting = this.profile.getSetting(e.group_id, name);
      }

      port.postMessage({
        name: listen, event: e,
      });
    });
    this.logger.info(`绑定 ${name} 插件 ${listen} 事件`);
  }

  // 执行 client 实例方法
  private async onApiTrigger(event: ApiTriggerEvent, port: PluginMessagePort) {
    const { method, params } = event;

    let value;
    if (typeof this[method] === 'function') {
      value = await (<Function>this[method])(...params);
    } else {
      value = this[method];
    }

    port.postMessage({
      name: 'bot.api.callback',
      event: value,
    });
  }

  /**
   * 给 bot 主人发送信息
   *
   * @param message - 通知信息
   * @returns 发消息的返回值
   */
  sendMasterMsg(message: string): Promise<MessageRet[]> {
    const queue: Promise<MessageRet>[] = [];

    for (const uin of this.masters) {
      queue.push(this.sendPrivateMsg(uin, message));
    }
    return Promise.all(queue);
  }

  private onFirstOnline(): void {
    this.bindEvents();
    this.sendMasterMsg('おはようございます、主様♪');
  }

  private onOnline(): void {
    this.sendMasterMsg('该账号刚刚从离线中恢复，现在一切正常');
    this.logger.mark(`${this.nickname} 刚刚从离线中恢复，现在一切正常`);
  }

  private onOffline(event: { message: string }): void {
    this.logger.mark(`${this.nickname} 已离线，${event.message}`);
  }

  /**
   * 绑定事件监听
   */
  private bindEvents(): void {
    this.removeAllListeners('system.login.slider');
    this.removeAllListeners('system.login.device');
    this.removeAllListeners('system.login.qrcode');

    this.on('system.online', this.onOnline);
    this.on('system.offline', this.onOffline);
  }

  /**
   * 查询用户是否为 master
   *
   * @param user_id - 用户 id
   * @returns 查询结果
   */
  isMaster(user_id: number): boolean {
    return this.masters.includes(user_id);
  }

  /**
   * 查询用户是否为 admin
   *
   * @param user_id - 用户 id
   * @returns 查询结果
   */
  isAdmin(user_id: number): boolean {
    return admins.includes(user_id);
  }
}
