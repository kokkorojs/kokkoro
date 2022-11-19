// import { join } from 'path';
// import { v4 as uuidv4 } from 'uuid';
// import { Dirent } from 'fs';
// import { mkdir, readdir } from 'fs/promises';
import { CronCommand, CronJob } from 'cron';
// import { isMainThread, parentPort, MessagePort, workerData, TransferListItem } from 'worker_threads';

// import { Listen } from '@/plugin/listen';
// import { Command, CommandType } from '@/plugin/command';
// import { PluginEventMap } from '@/events';
// import { Bot, BotEventName } from '@/core';
// import { Broadcast, BroadcastLinkEvent } from '@/worker';

// /** 插件消息 */
// export interface PluginMessage {
//   name: keyof PluginEventMap;
//   event: any;
// }

// // export interface BindListenEvent {
// //   name: string;
// //   listen: EventName;
// // }

// // export type PluginPostMessage =
// //   {
// //     name: 'bot.bind.event';
// //     event: BindListenEvent;
// //   } |
// //   {
// //     name: 'bot.bind.setting';
// //     event: BindSettingEvent;
// //   }

// export type BotApiParams<T extends Bot[keyof Bot]> = T extends (...args: any) => any
//   ? Parameters<T>
//   : [];

// export type BotApiReturnType<K extends keyof Bot> = Promise<
//   Bot[K] extends (...args: any) => any ? ReturnType<Bot[K]> : Bot[K]
// >;

// interface PluginParentPort extends MessagePort {
//   //   postMessage(message: PluginPostMessage, transferList?: ReadonlyArray<TransferListItem>): void;

//   addListener<T extends keyof PluginEventMap>(event: T, listener: PluginEventMap<this>[T]): this;
//   emit<T extends keyof PluginEventMap>(event: T, ...args: Parameters<PluginEventMap<this>[T]>): boolean;
//   on<T extends keyof PluginEventMap>(event: T, listener: PluginEventMap<this>[T]): this;
//   once<T extends keyof PluginEventMap>(event: T, listener: PluginEventMap<this>[T]): this;
//   prependListener<T extends keyof PluginEventMap>(event: T, listener: PluginEventMap<this>[T]): this;
//   prependOnceListener<T extends keyof PluginEventMap>(event: T, listener: PluginEventMap<this>[T]): this;
//   removeListener<T extends keyof PluginEventMap>(event: T, listener: PluginEventMap<this>[T]): this;
//   off<T extends keyof PluginEventMap>(event: T, listener: PluginEventMap<this>[T]): this;
// }

// const modules_path = join(__workname, 'node_modules');
// const plugins_path = join(__workname, 'plugins');
// const pluginParentPort = <PluginParentPort>parentPort;

// /** 插件信息 */
// export type PluginInfo = {
//   /** 插件名 */
//   name: string;
//   /** 文件夹 */
//   folder: string;
//   /** 插件路径 */
//   path: string;
//   /** 是否是本地插件 */
//   local: boolean;
// }

// /** 插件选项 */
// export type Option = {
//   /** 锁定，默认 false */
//   lock: boolean;
//   /** 开关，默认 true */
//   apply: boolean;
//   /** 其它设置 */
//   [param: string]: string | number | boolean | Array<string | number>;
// }

// export class Plugin {
//   // 插件名
//   private _name: string;
//   // 版本号
//   private _version: string;
//   // 定时任务
//   private jobs: CronJob[];
//   // 事件名
//   private events: Set<BotEventName>;
//   public commands: Command[];
//   private broadcasts: Map<number, Broadcast>;
//   private listener: Map<string, Listen>;
//   private info: PluginInfo;

//   constructor(
//     /** 指令前缀 */
//     public prefix: string = '',
//     /** 插件配置项 */
//     public option: Option = { apply: true, lock: false },
//   ) {
//     if (isMainThread) {
//       throw new Error('你在主线程跑这个干吗？');
//     }
//     this.info = workerData;
//     this._name = this.info.name;
//     this._version = '0.0.0';

//     this.jobs = [];
//     this.events = new Set();
//     this.commands = [];
//     this.broadcasts = new Map();
//     this.listener = new Map();

//     //#region 帮助指令
//     const helpCommand = new Command(this, 'help')
//       .description('帮助信息')
//       .action((ctx) => {
//         const message = ['Commands: '];
//         const commands_length = this.commands.length;

//         for (let i = 0; i < commands_length; i++) {
//           const command = this.commands[i];
//           const { raw_name, desc } = command;

//           message.push(`  ${raw_name}  ${desc}`);
//         }
//         ctx.reply(message.join('\n'));
//       });
//     //#endregion

//     // #region 版本指令
//     const versionCommand = new Command(this, 'version')
//       .description('版本信息')
//       .action((ctx) => {
//         ctx.reply(`${this._name} v${this._version}`);
//       });
//     //#endregion

//     // 有 prefix 的插件，实例化后都将自带 version 及 help 指令
//     if (this.prefix) {
//       setTimeout(() => {
//         this.commands.push(helpCommand);
//         this.commands.push(versionCommand);
//       });
//     }

//     this.initParentPortEvent();
//     this.bindParentPortEvent();

//     pluginParentPort.postMessage({
//       name: 'thread.plugin.created',
//     });
//   }

//   private initParentPortEvent() {
//     pluginParentPort.on('close', () => pluginParentPort.emit('plugin.close'));
//     pluginParentPort.on('message', (value) => pluginParentPort.emit('plugin.message', value));
//     pluginParentPort.on('messageerror', (error) => pluginParentPort.emit('plugin.messageerror', error));
//   }

//   private bindParentPortEvent() {
//     pluginParentPort.on('plugin.close', () => this.onClose());
//     pluginParentPort.on('plugin.message', (event) => this.onMessage(event));
//     pluginParentPort.on('plugin.messageerror', (event) => this.onMessageError(event));
//     pluginParentPort.on('plugin.broadcast.link', (event) => this.onBroadcastLink(event));
//     pluginParentPort.on('plugin.destroy', (code) => this.onDestroy(code));
//   }

//   private onClose() {
//     pluginParentPort.postMessage(`通道已关闭`);
//   }

//   private onMessage(message: PluginMessage) {
//     if (!message.name) {
//       throw new Error('message error');
//     }
//     pluginParentPort.emit(message.name, message.event);
//     pluginParentPort.postMessage(`插件线程收到消息: ${message}`);
//   }

//   private onMessageError(error: Error) {
//     pluginParentPort.postMessage(`反序列化消息失败: ${error.message}`);
//   }

//   // 连接广播通信
//   private onBroadcastLink(event: BroadcastLinkEvent) {
//     const { uin } = event;

//     if (this.broadcasts.has(uin)) {
//       return;
//     }
//     const broadcast = new Broadcast(uin.toString());

//     broadcast.postMessage({
//       name: 'bot.option.init',
//       option: this.option,
//       plugin_name: this._name,
//     });
//     pluginParentPort.postMessage(`连接广播 ${uin} 成功`);

//     this.events.forEach((name) => {
//       broadcast.on(name, (event) => {
//         if (name.startsWith('message')) {
//           this.parseMessage(event);
//         }
//         this.listener.get(name)?.run(event);
//       });
//       pluginParentPort.postMessage(`绑定 ${name} 事件`);
//     });
//     this.broadcasts.set(uin, broadcast);
//   }

//   private onDestroy(code: number = 0) {
//     process.exit(code);
//   }

//   name(name: string) {
//     this._name = name;
//     return this;
//   }

//   getName() {
//     return this._name;
//   }

//   version(version: string) {
//     this._version = version;
//     return this;
//   }

//   getVersion() {
//     return this._version;
//   }

//   async botApi<K extends keyof Bot>(uin: number, method: K, ...params: BotApiParams<Bot[K]>): BotApiReturnType<K> {
//     if (!this.broadcasts.has(uin)) {
//       throw new Error(`未与 broadcast(${uin}) 连接通信`);
//     }
//     const id = uuidv4();
//     const broadcast = this.broadcasts.get(uin)!;

//     broadcast.postMessage({
//       name: 'bot.task',
//       id, method, params,
//     })
//     return new Promise((resolve, reject) =>
//       broadcast.once(`bot.task.${id}`, (event: { result: any, error: Error }) => {
//         if (event.error) {
//           reject(event.error);
//         } else {
//           resolve(event.result);
//         }
//       })
//     );
//   }

//   schedule(cron: string, command: CronCommand) {
//     const job = new CronJob(cron, command, null, true);

//     this.jobs.push(job);
//     return this;
//   }

//   /**
//    * 指令监听
//    *
//    * @param raw_name - 指令
//    * @param type - 指令类型
//    * @returns Command 实例
//    */
//   command<T extends CommandType>(raw_name: string, type?: T): Command<T> {
//     const command = new Command(this, raw_name, type ?? 'all');

//     this.commands.push(command);
//     switch (type) {
//       case 'all':
//       case undefined:
//         this.events.add('message');
//         break;
//       case 'group':
//         this.events.add('message.group');
//         break;
//       case 'private':
//         this.events.add('message.private');
//         break;
//     }
//     return command;
//   }

//   /**
//    * 事件监听
//    *
//    * @param name - 事件名
//    * @returns Listen 实例
//    */
//   listen<K extends BotEventName>(name: K): Listen<K> {
//     const listen = new Listen(this);

//     // 单个插件单项事件不应该重复监听
//     this.events.add(name);
//     this.listener.set(name, listen);

//     return listen;
//   }

//   // 指令解析器
//   private parseMessage(event: any) {
//     this.commands.forEach((command) => {
//       if (!command.isMatched(event)) {
//         return;
//       }
//       command.run(event);
//     });
//   }
// }

// /**
//  * 检索可用插件
//  *
//  * @returns 插件信息集合
//  */
// export async function retrievalPlugins(): Promise<PluginInfo[]> {
//   const plugin_dirs: Dirent[] = [];
//   const module_dirs: Dirent[] = [];
//   const plugins: PluginInfo[] = [];

//   try {
//     const dirs = await readdir(plugins_path, { withFileTypes: true });
//     plugin_dirs.push(...dirs);
//   } catch (error) {
//     await mkdir(plugins_path);
//   }

//   for (const dir of plugin_dirs) {
//     if (dir.isDirectory() || dir.isSymbolicLink()) {
//       const folder = dir.name;
//       const name = folder.replace('kokkoro-plugin-', '');

//       try {
//         const path = require.resolve(join(plugins_path, folder));
//         const info: PluginInfo = {
//           name, folder, path, local: true,
//         };
//         plugins.push(info);
//       } catch {
//       }
//     }
//   }

//   try {
//     const dirs = await readdir(modules_path, { withFileTypes: true });
//     module_dirs.push(...dirs);
//   } catch (err) {
//     await mkdir(modules_path);
//   }

//   for (const dir of module_dirs) {
//     if (dir.isDirectory() && dir.name.startsWith('kokkoro-plugin-')) {
//       const folder = dir.name;
//       const name = folder.replace('kokkoro-plugin-', '');

//       try {
//         const path = require.resolve(join(modules_path, folder));
//         const info: PluginInfo = {
//           name, folder, path, local: false,
//         };
//         plugins.push(info);
//       } catch {
//       }
//     }
//   }
//   return plugins;
// }









import { join } from 'path';
import { Dirent } from 'fs';
import { mkdir, readdir } from 'fs/promises';
import { EventEmitter } from 'events';
import { getBotMap, Bot } from '@/core';
import { BotEvent, Context, ContextType, EmitEvent, EventName } from '@/events';
import { Command, CommandType } from './command';
import { getStack, logger } from '@/utils';

// import { Bot, botPool } from '../bot';
// import { BotEvent, Context, EventName } from '../events';
// import { Command, CommandType } from './command';
// import { getStack } from '../util';

const modules_path = join(__workname, 'node_modules');
const plugins_path = join(__workname, 'plugins');
const pluginMap: Map<string, Plugin> = new Map();

/** 插件信息 */
export type PluginInfo = {
  /** 插件名 */
  name: string;
  /** 文件夹 */
  folder: string;
  /** 插件文件 */
  filename: string;
  /** 是否是本地插件 */
  local: boolean;
}

/** 插件选项 */
export type Option = {
  /** 锁定，默认 false */
  lock: boolean;
  /** 开关，默认 true */
  apply: boolean;
  /** 其它设置 */
  [param: string]: string | number | boolean | Array<string | number>;
}

export class Plugin extends EventEmitter {
  private fullname: string;
  private name: string;
  // 版本号
  private ver: string;
  // 定时任务
  private jobs: CronJob[];
  // 事件名
  private events: Set<EventName>;
  public commands: Command[];
  // private listener: Map<string, Listen>;
  // private info: PluginInfo;
  // private info: any;
  public bl: Map<number, Bot>;

  constructor(
    /** 指令前缀 */
    public prefix: string = '',
    /** 插件配置项 */
    public option: Option = { apply: true, lock: false },
  ) {
    const stack = getStack();
    const filename = stack[2].getFileName()!;
    const { fullname, name } = getPluginName(filename);

    super();

    this.ver = '0.0.0';
    this.name = name;
    this.fullname = fullname;

    pluginMap.set(name, this);

    this.jobs = [];
    this.events = new Set();
    this.commands = [];
    // this.listener = new Map();
    // 此处命名与 oicq 保持一致，参考 gl、fl
    this.bl = getBotMap();

    this.initEvents();
    this.initCommands();

    logger.debug('created plugin');
  }

  /**
   * 获取插件名（简称）
   */
  public getName() {
    return this.name;
  }

  /**
   * 设置插件版本
   * 
   * @param ver - 若不设置则默认 "0.0.0"
   */
  public version(ver: string) {
    this.ver = ver;
    return this;
  }

  /**
   * 指令集
   * 
   * @param raw_name - 指令语句
   * @param type - 消息类型
   * @returns Command 实例
   */
  public command<T extends CommandType>(raw_name: string, type?: T): Command<T> {
    const command = new Command(this, raw_name, type ?? 'all');

    this.commands.push(command);
    switch (type) {
      case 'all':
      case undefined:
        this.events.add('message');
        break;
      case 'group':
        this.events.add('message.group');
        break;
      case 'private':
        this.events.add('message.private');
        break;
    }
    return command;
  }

  /**
   * 事件监听
   *
   * @param name - 事件名
   * @returns Listen 实例
   */
  // listen<K extends BotEventName>(name: K): Listen<K> {
  //   const listen = new Listen(this);

  //   // 单个插件单项事件不应该重复监听
  //   this.events.add(name);
  //   this.listener.set(name, listen);

  //   return listen;
  // }

  /**
   * 定时任务
   * 
   * @param cron - cron 表达式
   * @param command - 任务回调
   */
  public schedule(cron: string, command: CronCommand) {
    const job = new CronJob(cron, command, null, true);

    this.jobs.push(job);
    return this;
  }

  private parseMessage(ctx: any) {
    this.commands.forEach((command) => {
      if (!command.isMatched(ctx)) {
        return;
      }
      command.handle(ctx);
    });
  }

  private initEvents() {
    this.bl.forEach((bot) => {
      bot.emit('bot.profile.define', {
        name: this.getName(),
        option: this.option,
      });
      bot.on('bot.emit', (event) => this.onEmit(bot, event));

      // TODO
      bot.on('system.online', () => {
        this.events.forEach((name) => {
          this.on(name, (ctx) => {
            if (name.startsWith('message')) {
              this.parseMessage(ctx);
            }
            // this.listener.get(name)?.run(event);
          });
          bot.logger.debug(`插件 ${this.fullname} 绑定 ${name} 事件`);
        });
      });
    });
  }

  private initCommands() {
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
        ctx.reply(`${this.fullname} v${this.ver}`);
      });
    //#endregion

    // 有 prefix 的插件，实例化后都将自带 version 及 help 指令
    if (this.prefix) {
      // setTimeout(() => {
      this.commands.push(helpCommand);
      this.commands.push(versionCommand);
      // });
    }
  }

  private onEmit(bot: Bot, event: EmitEvent) {
    const { name, data } = event;
    const { group_id } = data as any;
    const context = data as any;

    // message 事件才会有 permission_level
    if (name.startsWith('message')) {
      context.permission_level = bot.getPermissionLevel(data as any);
    }

    // 所有 group 相关事件都会有 setting
    if (group_id) {
      context.setting = bot.getSetting(group_id);
    }
    context.disable = bot.getDisable();
    context.getBot = () => bot;

    this.emit(name, context);
  }
}

// function mountPlugin(name: string) {

// }

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

      try {
        const filename = require.resolve(join(plugins_path, folder));
        const info: PluginInfo = {
          name, folder, filename, local: true,
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

      try {
        const filename = require.resolve(join(modules_path, folder));
        const info: PluginInfo = {
          name, folder, filename, local: false,
        };
        plugins.push(info);
      } catch {
      }
    }
  }
  return plugins;
}

/**
 * 获取插件实例
 *
 * @param name - 插件名
 * @returns 插件实例
 */
function getPlugin(name: string): Plugin {
  if (!pluginMap.has(name)) {
    throw new Error(`plugin "${name}" is undefined`);
  }
  return pluginMap.get(name)!;
}

/**
 * 销毁插件
 *
 * @param filename - 插件文件路径
 */
function destroyPlugin(filename: string) {
  const module = require.cache[filename];
  const index = module?.parent?.children.indexOf(module);
  // const name = getPluginName();

  if (!module) {
    return;
  }
  if (index && index >= 0) {
    module.parent?.children.splice(index, 1);
  }

  for (const path in require.cache) {
    if (require.cache[path]?.id.startsWith(module.path)) {
      delete require.cache[path];
    }
  }

  delete require.cache[filename];
}

/**
 * 挂载插件模块
 *
 * @param raw_name - 插件名
 * @returns 插件实例对象
 */
export function mountPlugin(info: PluginInfo): Plugin {
  // 移除文件名前缀
  // const name = raw_name.replace('kokkoro-plugin-', '');
  const { name, filename } = info;

  if (pluginMap.has(name)) {
    return getPlugin(name);
  }

  try {
    // const plugins = await retrievalPlugins();

    // for (const plugin of plugins) {
    //   if (plugin.folder === raw_name || plugin.name === name) {
    //     require(plugin.filename);
    //     break;
    //   }
    // }
    // throw new Error(`cannot find "${raw_name}" plugin`);

    require(filename);
    logger.mark(`挂载插件 ${name} 成功`);

    return pluginMap.get(name)!;
  } catch (error) {
    const message = `"${name}" import module failed, ${(<Error>error).message}`;
    logger.error(`挂载插件 ${name} 失败`);
    throw new Error(message);
  }
}

/**
 * 获取插件名
 * 
 * @param filename - 插件文件路径
 * @returns 插件全称（包含 kokkoro-plugin-）与插件简称
 */
function getPluginName(filename: string): { fullname: string, name: string } {
  const regex = /(?<=\\(node_modules|plugins)\\).+?(?=\\)/;
  const fullname = regex.exec(filename)![0];
  const name = fullname.replace('kokkoro-plugin-', '');

  return {
    fullname, name,
  };
}
