import { join, resolve } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Dirent } from 'fs';
import { mkdir, readdir } from 'fs/promises';
import { CronCommand, CronJob } from 'cron';
import { isMainThread, parentPort, MessagePort, workerData, TransferListItem } from 'worker_threads';

import '@/kokkoro';
import { Bot } from '@/core';
import { Listen } from '@/plugin/listen';
import { BindSettingEvent } from '@/config';
import { PluginLinkChannelEvent } from '@/worker';
import { EventName, PluginEventMap } from '@/events';
import { Command, CommandType } from '@/plugin/command';

/** 插件消息 */
export interface PluginMessage {
  name: keyof PluginEventMap;
  event: any;
}

export interface BindListenEvent {
  name: string;
  listen: string;
}

export type PluginPostMessage =
  {
    name: 'bot.bind.event';
    event: BindListenEvent;
  } |
  {
    name: 'bot.bind.setting';
    event: BindSettingEvent;
  }

export type BotApiParams<T extends Bot[keyof Bot]> = T extends (...args: any) => any
  ? Parameters<T>
  : [];

interface PluginPort extends MessagePort {
  postMessage(message: PluginPostMessage, transferList?: ReadonlyArray<TransferListItem>): void;

  addListener<T extends keyof PluginEventMap>(event: T, listener: PluginEventMap<this>[T]): this;
  emit<T extends keyof PluginEventMap>(event: T, ...args: Parameters<PluginEventMap<this>[T]>): boolean;
  on<T extends keyof PluginEventMap>(event: T, listener: PluginEventMap<this>[T]): this
  once<T extends keyof PluginEventMap>(event: T, listener: PluginEventMap<this>[T]): this
  prependListener<T extends keyof PluginEventMap>(event: T, listener: PluginEventMap<this>[T]): this
  prependOnceListener<T extends keyof PluginEventMap>(event: T, listener: PluginEventMap<this>[T]): this
  removeListener<T extends keyof PluginEventMap>(event: T, listener: PluginEventMap<this>[T]): this
  off<T extends keyof PluginEventMap>(event: T, listener: PluginEventMap<this>[T]): this
}

const modules_path = join(__workname, 'node_modules');
const plugins_path = join(__workname, 'plugins');
const pluginPort: PluginPort = parentPort as PluginPort;

/** 插件信息 */
export type PluginInfo = {
  /** 插件名 */
  name: string;
  /** 文件夹 */
  folder: string;
  /** 插件路径 */
  path: string;
  /** 是否是本地插件 */
  local: boolean;
}

/** 插件选项 */
export type PluginSetting = {
  /** 锁定，默认 false */
  lock: boolean;
  /** 开关，默认 true */
  apply: boolean;
  /** 其它设置 */
  [param: string]: string | number | boolean | Array<string | number>;
}

export class Plugin {
  // 插件名
  public _name: string;
  // 版本号
  private _version: string;
  // 定时任务
  private jobs: CronJob[];
  // 事件名
  private events: Set<string>;
  public commands: Command[];
  // bot 通信端口
  private botPort: Map<number, MessagePort>;
  private listener: Map<string, Listen>;
  private info: PluginInfo;

  constructor(
    /** 指令前缀 */
    public prefix: string,
    /** 插件配置项 */
    public setting: PluginSetting = { apply: true, lock: false },
  ) {
    if (isMainThread) {
      throw new Error('你在主线程跑这个干吗？');
    }
    this.info = workerData;
    this._name = this.info.name;
    this._version = '0.0.0';

    this.jobs = [];
    this.events = new Set();
    this.botPort = new Map();
    this.commands = [];
    this.listener = new Map();

    //#region 帮助指令
    const helpCommand = new Command(this, 'help')
      .description('帮助信息')
      .action((ctx) => {
        const message = ['Commands: '];
        const commands_length = this.commands.length;

        for (let i = 0; i < commands_length; i++) {
          const command = this.commands[i];
          const { raw_name, desc } = command;

          message.push(`  ${raw_name}  ${desc}`);
        }
        ctx.reply(message.join('\n'));
      });
    //#endregion

    // #region 版本指令
    const versionCommand = new Command(this, 'version')
      .description('版本信息')
      .action((ctx) => {
        ctx.reply(`${this._name} v${this._version}`);
      });
    //#endregion

    // 有 prefix 的插件，实例化后都将自带 version 及 help 指令
    if (this.prefix) {
      setTimeout(() => {
        this.commands.push(helpCommand);
        this.commands.push(versionCommand);
      });
    }

    this.proxyPluginPortEvents();
    this.bindPluginPortEvents();
  }

  private proxyPluginPortEvents() {
    pluginPort.on('close', () => {
      pluginPort.emit('plugin.close');
    });
    pluginPort.on('message', (value) => {
      pluginPort.emit('plugin.message', value);
    });
    pluginPort.on('messageerror', (error) => {
      pluginPort.emit('plugin.messageerror', error);
    });
  }

  private bindPluginPortEvents() {
    pluginPort.on('plugin.close', () => this.onClose());
    pluginPort.on('plugin.message', (event) => this.onMessage(event));
    pluginPort.on('plugin.messageerror', (event) => this.onMessageError(event));
    pluginPort.on('plugin.link.channel', (event) => this.onLinkChannel(event));
    pluginPort.on('plugin.destroy', (code) => this.onDestroy(code));
  }

  private onClose() {
    // this.logger.info('通道已关闭');
  }

  private onMessage(message: PluginMessage) {
    if (!message.name) {
      throw new Error('message error');
    }
    pluginPort.emit(message.name, message.event);
    // this.logger.debug(`插件线程收到消息:`, message);
  }

  private onMessageError(error: Error) {
    // this.logger.error('反序列化消息失败:', error.message);
  }

  // 绑定插件线程通信
  private onLinkChannel(event: PluginLinkChannelEvent) {
    const { uin, port } = event;

    this.botPort.set(uin, port);
    this.events.forEach((name) => {
      const bindPluginEvent: PluginPostMessage = {
        name: 'bot.bind.event',
        event: {
          name: this.info.name,
          listen: name,
        },
      };
      const bindSettingEvent: PluginPostMessage = {
        name: 'bot.bind.setting',
        event: {
          name: this.info.name,
          setting: this.setting,
        },
      };

      port.postMessage(bindPluginEvent);
      port.postMessage(bindSettingEvent);
      port
        .on('message', (value: any) => {
          if (value.name) {
            port.emit(value.name, value.event);
          }
        })
        .on(name, async (event) => {
          // MessagePort 事件会与 oicq 事件冲突
          if (name === 'message' && !event.message_id) {
            return;
          }
          this.listener.get(name)?.run(event);

          if (name.startsWith('message')) {
            this.parse(event);
          }
        })
    });
  }

  private onDestroy(code: number = 0) {
    process.exit(code);
  }

  name(name: string) {
    this._name = name;
    return this;
  }

  version(version: string) {
    this._version = version;
    return this;
  }

  // runMatchedCommand() {
  //   // const {args, options, matchedCommand: command} = super;

  //   const args = super.args;
  //   const options = super.options;
  //   const command = super.matchedCommand;

  //   if (!command || !command.commandAction)
  //     return;
  //   command.checkUnknownOptions();
  //   command.checkOptionValue();
  //   command.checkRequiredArgs();
  //   const actionArgs = [];
  //   command.args.forEach((arg, index) => {
  //     if (arg.variadic) {
  //       actionArgs.push(args.slice(index));
  //     } else {
  //       actionArgs.push(args[index]);
  //     }
  //   });
  //   actionArgs.push(options);
  //   return command.commandAction.apply(this, actionArgs);
  // }

  async botApi<K extends keyof Bot>(uin: number, method: K, ...params: BotApiParams<Bot[K]>): Promise<
    Bot[K] extends (...args: any) => any ? ReturnType<Bot[K]> : Bot[K]
  > {
    if (!this.botPort.has(uin)) {
      throw new Error(`bot(${uin}) 线程未创建`);
    }
    const port = this.botPort.get(uin)!;
    const id = uuidv4();
    const event = {
      name: 'bot.api.task',
      event: { method, params, id },
    };

    port.postMessage(event);

    return new Promise((resolve, reject) =>
      port.once(`task.${id}`, (task: { result: any, error: Error }) => {
        if (task.error) {
          reject(task.error);
        } else {
          resolve(task.result);
        }
      })
    );
  }

  schedule(cron: string, command: CronCommand) {
    const job = new CronJob(cron, command, null, true);

    this.jobs.push(job);
    return this;
  }

  // sendPrivateMsg(event: any) {
  //   const { self_id } = event;
  //   const port_event = {
  //     name: 'message.send', event,
  //   };
  //   this.botPort.get(self_id)?.postMessage(port_event);
  // }

  // sendAllMessage(event: PortEventMap['message.send']) {
  //   const port_event = {
  //     name: 'message.send', event,
  //   };
  //   this.botPort.forEach((port) => {
  //     port.postMessage(port_event);
  //   })
  // }

  // recallMessage(event: any) {
  //   const { self_id } = event;
  //   this.botPort.get(self_id)?.postMessage(event);
  // }

  /**
   * 指令监听
   * 
   * @param raw_name - 指令
   * @param message_type - 消息类型
   * @returns Command 实例
   */
  command<T extends CommandType>(raw_name: string, message_type?: T): Command<T> {
    const command = new Command(this, raw_name, message_type ?? 'all');

    this.commands.push(command);
    this.events.add('message');
    return command;
  }

  /**
   * 事件监听
   * 
   * @param event_name - 事件名
   * @returns Listen 实例
   */
  listen<K extends EventName>(name: K): Listen<K> {
    const listen = new Listen(name, this);

    // 单个插件单项事件不应该重复监听
    this.events.add(name);
    this.listener.set(name, listen);
    return listen;
  }

  // 指令解析器
  private parse(event: any) {
    const argv: string[] = event.raw_message.trim().split(' ');
    const prefix: string = argv[0];

    this.commands.forEach((command) => {
      if (!command.isMatched(event)) {
        return;
      }
      command.run(event);
    });
  }
}

/**
 * 检索可用插件
 *
 * @returns 插件信息集合
 */
export async function retrievalPlugins(): Promise<PluginInfo[]> {
  const plugin_dirs: Dirent[] = [];
  const module_dirs: Dirent[] = [];
  const plugins: PluginInfo[] = [];

  try {
    const dirs = await readdir(plugins_path, { withFileTypes: true });
    plugin_dirs.push(...dirs);
  } catch (error) {
    await mkdir(plugins_path);
  }

  for (const dir of plugin_dirs) {
    if (dir.isDirectory() || dir.isSymbolicLink()) {
      const folder = dir.name;
      const name = folder.replace('kokkoro-plugin-', '');
      const path = join(plugins_path, name);

      try {
        require.resolve(path);
        const info: PluginInfo = {
          name, folder, path, local: true,
        };
        plugins.push(info);
      } catch {
      }
    }
  }

  try {
    const dirs = await readdir(modules_path, { withFileTypes: true });
    module_dirs.push(...dirs);
  } catch (err) {
    await mkdir(modules_path);
  }

  for (const dir of module_dirs) {
    if (dir.isDirectory() && dir.name.startsWith('kokkoro-plugin-')) {
      const folder = dir.name;
      const name = folder.replace('kokkoro-plugin-', '');
      const path = join(modules_path, name);

      try {
        require.resolve(path);
        const info: PluginInfo = {
          name, folder, path, local: false,
        };
        plugins.push(info);
      } catch {
      }
    }
  }

  return plugins;
}
