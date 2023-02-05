import { CronJob } from 'cron';
import { join, resolve } from 'path';
import { EventEmitter } from 'events';
import { getLogger, Logger } from 'log4js';
import { Dirent } from 'fs';
import { mkdir, readdir } from 'fs/promises';
import { decache, getStack } from '@kokkoro/utils';

import { getBotList } from '@/core';
import { getConfig } from '@/config';
import { Bot, logger } from '@/kokkoro';
import { Context, EventName } from '@/events';
import { Event } from '@/plugin/event';
import { Command, CommandType } from '@/plugin/command';

/** 插件消息事件 */
interface PluginMessageEvent<K extends EventName = any> {
  name: K;
  data: Context<K>;
}

const modules_path = resolve('node_modules');
const plugins_path = resolve('plugins');
const pluginList: Map<string, Plugin> = new Map();

/** 插件选项 */
export interface Option {
  /** 锁定，默认 false */
  lock: boolean;
  /** 开关，默认 true */
  apply: boolean;
  /** 其它设置 */
  [param: string]: unknown;
}

/** 插件信息 */
export interface PluginInfo {
  /** 插件名 */
  name: string;
  /** 文件夹 */
  folder: string;
  /** 插件文件 */
  filename: string;
  /** 是否是本地插件 */
  local: boolean;
}

/**
 * 检索可用插件信息
 * 
 * @returns 插件信息列表
 */
export async function retrievalPluginInfos(): Promise<PluginInfo[]> {
  const pluginDirs: Dirent[] = [];
  const moduleDirs: Dirent[] = [];
  const pluginInfos: PluginInfo[] = [];

  try {
    const dirs = await readdir(plugins_path, { withFileTypes: true });
    pluginDirs.push(...dirs);
  } catch (error) {
    await mkdir(plugins_path);
  }

  for (const dir of pluginDirs) {
    if (dir.isDirectory() || dir.isSymbolicLink()) {
      const folder = dir.name;
      const name = folder.replace('kokkoro-plugin-', '');

      try {
        const filename = require.resolve(join(plugins_path, folder));
        const info: PluginInfo = {
          local: true,
          name, folder, filename,
        };

        pluginInfos.push(info);
      } catch { }
    }
  }

  try {
    const dirs = await readdir(modules_path, { withFileTypes: true });
    moduleDirs.push(...dirs);
  } catch (err) {
    await mkdir(modules_path);
  }

  for (const dir of moduleDirs) {
    if (dir.isDirectory() && dir.name.startsWith('kokkoro-plugin-')) {
      const folder = dir.name;
      const name = folder.replace('kokkoro-plugin-', '');

      try {
        const filename = require.resolve(join(modules_path, folder));
        const info: PluginInfo = {
          local: false,
          name, folder, filename,
        };
        pluginInfos.push(info);
      } catch { }
    }
  }
  return pluginInfos;
}

export function getPluginList(): Map<string, Plugin> {
  return pluginList;
}

/**
 * 获取插件实例
 * 
 * @param name - 插件名
 * @returns 插件实例
 */
function getPlugin(name: string): Plugin {
  if (!pluginList.has(name)) {
    throw new Error(`plugin "${name}" is undefined`);
  }
  return pluginList.get(name)!;
}

/**
 * 导入插件模块
 * 
 * @param info - 插件信息
 * @returns 插件实例对象
 */
export function importPlugin(info: PluginInfo): Plugin {
  const { name, filename } = info;

  if (pluginList.has(name)) {
    return getPlugin(name);
  }

  try {
    require(filename);
    logger.info(`plugin "${name}" import success`);

    return pluginList.get(name)!;
  } catch (error) {
    const message = `import module "${name}" failed, ${(<Error>error).message}`;
    logger.error(`plugin "${name}" import failure`);

    throw new Error(message);
  }
}

/**
 * 销毁插件模块
 * 
 * @param info - 插件信息
 */
export function destroyPlugin(info: PluginInfo): void {
  const { filename, name } = info;

  decache(filename);
  pluginList.delete(name);
}

/**
 * 获取插件信息
 * 
 * @returns 插件信息
 */
function getPluginInfo(): PluginInfo {
  const stack = getStack();
  const filename = stack[2].getFileName()!;

  const regex = /(?<=(\\|\/)(node_modules|plugins)(\\|\/)).+?(?=(\\|\/))/;
  const folder = regex.exec(filename)?.[0] ?? 'kokkoro';
  const name = folder.replace('kokkoro-plugin-', '');
  const local = filename.indexOf('node_modules') === -1;

  return {
    name, folder, filename, local,
  };
}

export class Plugin extends EventEmitter {
  /** 版本号 */
  private v: string;
  /** 帮助提示 */
  private h?: string;
  /** 定时任务 */
  private jobs: CronJob[];
  /** 事件名清单 */
  private events: Set<EventName>;
  /** 监听器列表 */
  private eventList: Map<string, Event>;
  /** 插件信息 */
  public info: PluginInfo;
  /** 日志 */
  public logger: Logger;
  /** bot 列表 */
  public bl: Map<number, Bot>;
  /** 指令清单 */
  public commands: Command[];

  constructor(
    /** 指令前缀 */
    public prefix: string = '',
    /** 插件配置项 */
    public option: Option = { apply: true, lock: false },
  ) {
    super();

    const info = getPluginInfo();

    this.v = 'none';
    this.jobs = [];
    this.events = new Set();
    this.eventList = new Map();
    this.info = info;
    this.bl = getBotList();
    this.commands = [];
    this.logger = getLogger(`[plugin:${info.name}]`);
    this.logger.level = getConfig('log_level');

    this.initEvents();
    this.initCommands();

    pluginList.set(info.name, this);
  }

  /**
   * 获取插件名。
   */
  public getName(): string {
    return this.info.name;
  }

  /**
   * 设置插件版本。
   * 
   * @param v - 若不设置则默认 "none"。
   */
  public version(v: string): this {
    this.v = v;
    return this;
  }

  /**
   * 自定义插件帮助信息。
   */
  public help(message: string): this {
    this.h = message;
    return this;
  }

  /**
   * 定时任务
   * 
   * @param cron - cron 表达式
   * @param callback - 任务回调
   */
  public schedule(cron: string, callback: () => any) {
    const func = async () => {
      try {
        await callback();
      } catch (error) {
        this.logger.error(error);
      }
    };
    const job = new CronJob(cron, func, null, true);

    this.jobs.push(job);
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
    const command = new Command(this, raw_name, type);

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
    this.commands.push(command);

    return command;
  }

  /**
   * 事件监听
   * 
   * @param name - 事件名
   * @returns Event 实例
   */
  public event<K extends EventName>(name: K): Event<K> {
    const event = new Event(this);

    this.events.add(name);
    this.eventList.set(name, event);

    return event;
  }

  /**
   * 插件销毁
   */
  private onDestroy() {
    this.jobs.forEach((job) => {
      job.stop();
    });
    this.removeAllListeners();

    pluginList.delete(this.info.name);
  }

  /**
   * 事件处理
   */
  private onMessage(bot: Bot, event: PluginMessageEvent) {
    const plugins = bot.profile.getDisablePlugins();

    if (plugins.includes(this.info.name)) {
      return;
    }
    const { name, data } = event;

    // message 事件才会有 permission_level
    if (name.startsWith('message')) {
      data.permission_level = bot.getPermissionLevel(data as Context<'message'>);
    }

    // 所有 group 相关事件都会有 setting
    if (data.group_id) {
      data.setting = bot.profile.getSetting(data.group_id);
    }
    data.bot = bot;

    data.revise = (key: string, value: string | number | boolean, plugin: string = this.info.name) => {
      return bot.profile.updateOption(data.group_id!, plugin, key, value);
    };
    data.getBot = (uin: number) => this.bl.get(uin);

    this.emit(name, data);
  }

  private parseMessage(ctx: any) {
    this.commands.forEach((command) => {
      if (!command.isMatched(ctx)) {
        return;
      }
      command.handle(ctx);
    });
  }

  private initCommands() {
    // 有 prefix 的插件，实例化后都将自带 update、help 及 version 指令
    if (!this.prefix) {
      return;
    }

    const updateCommand = new Command<'all'>(this, 'update <option> <value>')
      .description('修改插件配置')
      .action(async (ctx) => {
        const { query } = ctx;
        const { option, value } = query;

        try {
          await ctx.revise(option, value);
          ctx.reply('修改成功');
        } catch (error) {
          ctx.reply((<Error>error).message);
        }
      });
    const helpCommand = new Command<'all'>(this, 'help')
      .description('帮助信息')
      .action((ctx) => {
        if (!this.h) {
          const message = ['Commands: '];
          const commands_length = this.commands.length;

          for (let i = 0; i < commands_length; i++) {
            const command = this.commands[i];
            const { raw_name, desc } = command;

            message.push(`  ${raw_name}  ${desc}`);
          }
          this.h = message.join('\n');
        }
        ctx.reply(this.h);
      });
    const versionCommand = new Command<'all'>(this, 'version')
      .description('版本信息')
      .action((ctx) => {
        ctx.reply(`${this.info.folder} v${this.v}`);
      });

    setTimeout(() => {
      this.commands.push(updateCommand);
      this.commands.push(helpCommand);
      this.commands.push(versionCommand);
    });
  }

  private initEvents() {
    this.bl.forEach((bot) => {
      if (this.info.name !== 'kokkoro') {
        bot.profile.defineOption(this.info.name, this.option);
      }

      this.on('plugin.destroy', () => this.onDestroy());
      this.on('plugin.message', (event) => this.onMessage(bot, event));

      setTimeout(() => {
        this.events.forEach((name) => {
          this.on(name, (ctx) => {
            if (name.startsWith('message')) {
              this.parseMessage(ctx);
            }
            this.eventList.get(name)?.handle(ctx);
          });
          this.logger.debug(`绑定 ${name} 事件`);
        });
      });
    });
  }
}
