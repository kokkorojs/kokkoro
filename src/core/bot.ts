import { v4 as uuidv4 } from 'uuid';
import { Subscription, take } from 'rxjs';
import { parentPort, MessagePort, TransferListItem, isMainThread } from 'worker_threads';
import { ClientEvent, ClientEventMap, ClientObserver, Config as Protocol, event, GroupRole, MessageRet } from 'amesu';

import { Profile } from '@/config';
import { deepMerge } from '@/utils';
import { BotEventMap } from '@/events';
import { Option, retrievalPlugins } from '@/plugin';
import { Broadcast, BroadcastLinkEvent } from '@/worker';

export interface ApiTaskEvent {
  id: string;
  method: keyof ClientObserver;
  params: unknown[];
}

export interface OptionInitEvent {
  option: Option;
  plugin_name: string;
}


// export type BotPostMessage =
//   {
//     name: 'thread.process.stdin';
//     event?: string;
//   } |
//   {
//     name: 'thread.plugin.mount';
//     event: PluginMountEvent;
//   } |
//   {
//     name: 'thread.plugin.unmount';
//     event: PluginUnmountEvent;
//   } |
//   {
//     name: 'thread.plugin.reload';
//     event: PluginUnmountEvent;
//   }

export type PermissionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface BotParentPort extends MessagePort {
  // postMessage(message: BotPostMessage, transferList?: ReadonlyArray<TransferListItem>): void;

  addListener<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this;
  emit<T extends keyof BotEventMap>(event: T, ...args: Parameters<BotEventMap<this>[T]>): boolean;
  on<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this;
  once<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this;
  once<S extends string | symbol>(event: S & Exclude<S, keyof BotEventMap>, listener: (this: this, ...args: any[]) => void): this
  prependListener<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this;
  prependOnceListener<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this;
  removeListener<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this;
  off<T extends keyof BotEventMap>(event: T, listener: BotEventMap<this>[T]): this;
}

/** bot 消息 */
export interface BotMessage {
  name: keyof BotEventMap;
  event: any;
}

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

/** 消息事件名 */
export type BotEventName = keyof ClientEventMap;

const admins: number[] = [
  parseInt('84a11e2b', 16),
];
const botParentPort = <BotParentPort>parentPort;

export class Bot extends ClientObserver {
  private masters: number[];
  private readonly password?: string;
  private profile: Profile;
  private broadcast: Broadcast;

  constructor(uin: number, config?: BotConfig) {
    if (isMainThread) {
      throw new Error('你在主线程跑这个干吗？');
    }
    const defaultConfig: BotConfig = {
      auto_login: true,
      masters: [],
      protocol: {
        data_dir: 'data/bot',
      },
    };
    config = deepMerge(defaultConfig, config);

    super(uin, config.protocol);

    this.masters = config.masters!;
    this.password = config.password;
    this.profile = new Profile(this);
    this.broadcast = new Broadcast(this.uin.toString());
    this
      .pipe(
        event('system.online'),
        take(1),
      )
      .subscribe(() => {
        this.profile.emit('profile.refresh');
        this.initSubscribe();
        this.sendMasterMsg('おはようございます、主様♪');
      })

    this
      .subscribe(event => {
        for (const key in event) {
          if (typeof event[key] === 'function') delete event[key];
        }
        // message 事件才会有 permission_level
        if (event.name.startsWith('message')) {
          event.permission_level = this.getPermissionLevel(event);
        }
        // 所有 group 相关事件都会有 setting
        if (event.group_id) {
          event.setting = this.getSetting(event.group_id);
        }
        event.disable = this.profile.disable;

        this.broadcast.postMessage(event);
      })

    this.broadcast.on('bot.task', (event) => this.onTask(event));
    this.broadcast.on('bot.option.init', (event) => this.onOptionInit(event));

    this.initParentPortEvent();
    this.bindParentPortEvent();

    botParentPort.postMessage({
      name: 'thread.broadcast.link',
      event: {
        uin,
      }
    });
    botParentPort.postMessage({
      name: 'thread.bot.created',
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
   * @returns 权限等级
   */
  public getPermissionLevel(event: ClientEvent<'message'>): PermissionLevel {
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

  // 执行 client 实例方法
  private async onTask(event: ApiTaskEvent) {
    let result: any, error: any;
    const { id, method, params } = event;

    if (typeof this[method] === 'function') {
      try {
        result = await this[method](...params);
      } catch (err) {
        error = err;
      }
    } else {
      result = this[method];
    }
    this.broadcast.postMessage({
      name: `bot.task.${id}`,
      result, error,
    });
  }

  private onOptionInit(event: OptionInitEvent) {
    const { plugin_name, option } = event;

    if (plugin_name === 'kokkoro') {
      return;
    }
    this.profile.emit('profile.option.init', {
      plugin_name, option,
    });
  }

  /**
   * 获取群插件设置
   * 
   * @param group_id - 群号
   * @returns 群插件设置
   */
  private getSetting(group_id: number) {
    return this.profile.group[group_id].setting;
  }

  /**
   * 挂载插件
   * 
   * @param name - 插件名
   * @returns 
   */
  async mountPlugin(name: string): Promise<void> {
    let info;

    const plugins = await retrievalPlugins();
    const plugins_length = plugins.length;

    for (let i = 0; i < plugins_length; i++) {
      const plugin = plugins[i];

      if (plugin.name === name) {
        info = plugin;
        break;
      }
    }

    if (!info) {
      throw new Error(`plugins 与 node_modules 目录均未检索到 ${name} 和 kokkoro-plugin-${name} 插件`);
    }
    const id = uuidv4();

    botParentPort.postMessage({
      name: 'thread.plugin.mount',
      event: {
        id, info,
        uin: this.uin,
      },
    });

    return new Promise((resolve, reject) =>
      botParentPort.once(`bot.task.${id}`, (error) => {
        if (error) {
          return reject(new Error(error));
        }
        resolve();
      })
    );
  }

  /**
   * 销毁插件
   * 
   * @param name - 插件名
   * @returns 
   */
  async unmountPlugin(name: string): Promise<void> {
    const id = uuidv4();

    botParentPort.postMessage({
      name: 'thread.plugin.unmount',
      event: {
        id, name,
        uin: this.uin,
      },
    });

    return new Promise((resolve, reject) => {
      botParentPort.once(`bot.task.${id}`, (error) => {
        error ? reject(new Error(error)) : resolve();
      });
    });
  }

  /**
   * 重载插件
   * 
   * @param name - 插件名
   * @returns 
   */
  async reloadPlugin(name: string): Promise<void> {
    const id = uuidv4();

    botParentPort.postMessage({
      name: 'thread.plugin.reload',
      event: {
        id, name,
        uin: this.uin,
      },
    });

    return new Promise((resolve, reject) => {
      botParentPort.once(`bot.task.${id}`, (error) => {
        error ? reject(new Error(error)) : resolve();
      });
    });
  }

  // TODO ⎛⎝≥⏝⏝≤⎛⎝ 待优化
  async enablePlugin(name: string): Promise<void> {
    let error;

    if (!this.profile.defaultOption[name]) {
      error = `插件 ${name} 未挂载`;
    } else if (!this.profile.disable.has(name)) {
      error = `插件 ${name} 不在禁用列表`;
    } else {
      this.profile.disable.delete(name);

      try {
        await this.profile.write();
        this.logger.info(`更新了禁用列表，移除了插件：${name}`);
      } catch (err) {
        error = `更新禁用列表失败，${(<Error>err).message}`;
        this.profile.disable.add(name);
      }
    }
    if (error) {
      this.logger.error(error);
      throw new Error(error);
    }
  }

  // TODO ⎛⎝≥⏝⏝≤⎛⎝ 待优化
  async disablePlugin(name: string): Promise<void> {
    let error;

    if (!this.profile.defaultOption[name]) {
      error = `插件 ${name} 未挂载`;
    } else if (this.profile.disable.has(name)) {
      error = `插件 ${name} 已在禁用列表`;
    } else {
      this.profile.disable.add(name);

      try {
        await this.profile.write();
        this.logger.info(`更新了禁用列表，新增了插件：${name}`);
      } catch (err) {
        error = `更新禁用列表失败，${(<Error>err).message}`;
        this.profile.disable.delete(name);
      }
    }
    if (error) {
      this.logger.error(error);
      throw new Error(error);
    }
  }

  // TODO ⎛⎝≥⏝⏝≤⎛⎝ 待优化
  async applyPlugin(group_id: number, name: string): Promise<void> {
    let error;

    if (!this.profile.defaultOption[name]) {
      error = `插件 ${name} 未挂载`;
    } else if (this.profile.group[group_id].setting[name].apply) {
      error = `群服务 ${name} 已被应用`;
    } else {
      this.profile.group[group_id].setting[name].apply = true;

      try {
        await this.profile.write();
        this.logger.info(`更新了配置列表，应用了插件：${name}`);
      } catch (err) {
        error = `更新配置列表失败，${(<Error>err).message}`;
        this.profile.group[group_id].setting[name].apply = false;
      }
    }
    if (error) {
      this.logger.error(error);
      throw new Error(error);
    }
  }

  // TODO ⎛⎝≥⏝⏝≤⎛⎝ 待优化
  async exemptPlugin(group_id: number, name: string): Promise<void> {
    let error;

    if (!this.profile.defaultOption[name]) {
      error = `插件 ${name} 未挂载`;
    } else if (!this.profile.group[group_id].setting[name].apply) {
      error = `群服务 ${name} 未被应用`;
    } else {
      this.profile.group[group_id].setting[name].apply = false;

      try {
        await this.profile.write();
        this.logger.info(`更新了配置列表，免除了插件：${name}`);
      } catch (err) {
        error = `更新配置列表失败，${(<Error>err).message}`;
        this.profile.group[group_id].setting[name].apply = true;
      }
    }
    if (error) {
      this.logger.error(error);
      throw new Error(error);
    }
  }

  /**
   * 账号登录
   */
  public async linkStart() {
    const subscription = this.password ? this.passwordSubscribe() : this.qrcodeSubscribe();

    await new Promise<void>((resolve, reject) => {
      this
        .pipe(
          event(['system.online', 'system.login.error']),
          take(1),
        )
        .subscribe((event) => {
          // 取消事件订阅
          subscription.unsubscribe();
          event.name === 'system.online' ? resolve() : reject(event);
        })
    })
  }

  /**
   * 扫描登录
   *
   * 优点是不需要过滑块和设备锁
   * 缺点是万一 token 失效，无法自动登录，需要重新扫码
   */
  private qrcodeSubscribe(): Subscription {
    const subscription = this
      .pipe(
        event('system.login.qrcode'),
      )
      .subscribe(() => {
        // 扫码轮询
        const interval_id = setInterval(async () => {
          const { retcode } = await this.queryQrcodeResult();

          // 0: 扫码完成 48: 未确认 53: 取消扫码
          if (retcode === 0 || ![48, 53].includes(retcode)) {
            clearInterval(interval_id);
            this.login();
          }
        }, 500);

        this.logger.info('扫码完成后将会自动登录，按回车键可刷新二维码');

        botParentPort.once('thread.process.stdout', () => {
          // TODO ⎛⎝≥⏝⏝≤⎛⎝ 如何主动取消 process.stdin 监听？
          if (this.isOnline()) {
            return;
          }
          clearInterval(interval_id);
          this.login();
        });
        botParentPort.postMessage({
          name: 'thread.process.stdin',
        });
      })

    this.login();
    return subscription;
  }

  /**
   * 密码登录
   *
   * 优点是一劳永逸
   * 缺点是需要过滑块，可能会报环境异常
   */
  private passwordSubscribe() {
    const subscription = this
      .pipe(
        event(['system.login.slider', 'system.login.device']),
      )
      .subscribe(event => {
        switch (event.name) {
          case 'system.login.slider':
            botParentPort.once('thread.process.stdout', (content) => {
              this.submitSlider(content);
            });
            botParentPort.postMessage({
              name: 'thread.process.stdin',
              event: '请输入 ticket: ',
            });
            break;
          case 'system.login.device':
            // TODO ⎛⎝≥⏝⏝≤⎛⎝ 设备锁轮询，oicq 暂无相关 func
            this.logger.info('验证完成后按回车键继续...');

            botParentPort.once('thread.process.stdout', () => {
              this.login();
            });
            botParentPort.postMessage({
              name: 'thread.process.stdin',
            });
            break;
        }
      })

    this.login(this.password);
    return subscription;
  }

  /**
   * 初始化事件订阅
   */
  private initSubscribe(): void {
    this
      .pipe(
        event(['system.online', 'system.offline']),
      )
      .subscribe(event => {
        switch (event.name) {
          case 'system.online':
            this.onOnline();
            break;
          case 'system.offline':
            this.onOffline(event as ClientEvent<'system.offline'>);
            break;
        }
      })
  }

  private onOnline(): void {
    this.profile.emit('profile.refresh');
    this.sendMasterMsg('该账号刚刚从离线中恢复，现在一切正常');
    this.logger.mark(`${this.nickname} 刚刚从离线中恢复，现在一切正常`);
  }

  private onOffline(event: ClientEvent<'system.offline'>): void {
    this.logger.mark(`${this.nickname} 已离线，${event.message}`);
  }

  private initParentPortEvent() {
    botParentPort.on('close', () => botParentPort.emit('bot.close'));
    botParentPort.on('message', (value) => botParentPort.emit('bot.message', value));
    botParentPort.on('messageerror', (error) => botParentPort.emit('bot.messageerror', error));
  }

  private bindParentPortEvent() {
    botParentPort.on('bot.close', () => this.onClose());
    botParentPort.on('bot.message', (event) => this.onMessage(event));
    botParentPort.on('bot.messageerror', (event) => this.onMessageError(event));
    botParentPort.on('bot.broadcast.link', (event) => this.onBroadcastLink(event));
    // pluginParentPort.on('plugin.destroy', (code) => this.onDestroy(code));
  }

  private onClose() {
    this.logger.info('通道已关闭');
  }

  private onMessage(message: BotMessage) {
    if (!message.name) {
      throw new Error('message error');
    }
    botParentPort.emit(message.name, message.event);
    this.logger.debug(`bot 线程收到消息:`, message);
  }

  private onMessageError(error: Error) {
    this.logger.error('反序列化消息失败:', error.message);
  }

  /**
   * 挂载插件线程时会触发，用于连接广播通信
   * 
   * @param event 
   */
  private onBroadcastLink(event: BroadcastLinkEvent) {
    const { uin } = event;

    botParentPort.postMessage({
      name: 'thread.broadcast.link',
      event: {
        uin,
      }
    });
    this.profile.once('profile.option.init', () => {
      this.profile.emit('profile.refresh');
    });
  }
}
