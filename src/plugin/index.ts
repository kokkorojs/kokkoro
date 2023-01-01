import { Dirent } from 'fs';
import { mkdir, readdir } from 'fs/promises';
import { CronJob } from 'cron';
import { Logger, getLogger } from 'log4js';
import { join, resolve } from 'path';
import { EventEmitter } from 'events';

import { logger } from '@/kokkoro';
import { getStack } from '@/utils';
import { getConfig } from '@/config';
import { getBotList, Bot } from '@/core';
import { Listen } from '@/plugin/listen';
import { Command, CommandType } from '@/plugin/command';
import { PluginMessageEvent, EventName, BotEvent } from '@/events';

const modules_path = resolve('node_modules');
const plugins_path = resolve('plugins');
const pluginList: Map<string, Plugin> = new Map();

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

/** 插件选项 */
export interface Option {
  /** 锁定，默认 false */
  lock: boolean;
  /** 开关，默认 true */
  apply: boolean;
  /** 其它设置 */
  [param: string]: string | number | boolean | Array<string | number>;
}

export class Plugin extends EventEmitter {
  /** 版本号 */
  private ver: string;
  /** 指令提示 */
  private guide?: string;
  /** 定时任务 */
  private jobs: CronJob[];
  /** 事件名清单 */
  private events: Set<EventName>;
  /** 指令清单 */
  public commands: Command[];
  /** 监听器清单 */
  private listener: Map<string, Listen>;

  /** bot 列表 */
  public bl: Map<number, Bot>;
  /** 插件信息 */
  public info: PluginInfo;
  /** 日志 */
  public logger: Logger;

  constructor(
    /** 指令前缀 */
    public prefix: string = '',
    /** 插件配置项 */
    public option: Option = { apply: true, lock: false },
  ) {
    // TODO ／人◕ ‿‿ ◕人＼ 动态解析
    const stack = getStack();
    const filename = stack[2].getFileName()!;
    const info = parsePluginInfo(filename);

    super();

    this.info = info;
    this.ver = '0.0.0';
    this.jobs = [];
    this.events = new Set();
    this.commands = [];
    this.listener = new Map();
    this.bl = getBotList();
    this.logger = getLogger(`[plugin:${info.name}]`);
    this.logger.level = getConfig('log_level');

    this.initEvents();
    this.initCommands();

    pluginList.set(info.name, this);
  }

  /**
   * 获取插件名
   */
  public getName(): string {
    return this.info.name;
  }

  /**
   * 设置插件版本
   * 
   * @param ver - 若不设置则默认 "0.0.0"
   */
  public version(ver: string): this {
    this.ver = ver;
    return this;
  }

  /**
   * 自定义插件帮助信息
   * 
   */
  public help(message: string): this {
    this.guide = message;
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
  listen<K extends EventName>(name: K): Listen<K> {
    const listen = new Listen(this);

    // 单个插件单项事件不应该重复监听
    this.events.add(name);
    this.listener.set(name, listen);

    return listen;
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
      if (this.info.name !== 'kokkoro') {
        bot.emit('bot.profile.define', {
          name: this.info.name,
          option: this.option,
        });
      }
      this.on('plugin.destroy', () => this.onDestroy());
      this.on('plugin.message', (event) => this.onMessage(bot, event));

      setTimeout(() => {
        this.events.forEach((name) => {
          this.on(name, (ctx) => {
            if (name.startsWith('message')) {
              this.parseMessage(ctx);
            }
            this.listener.get(name)?.handle(ctx);
          });
          this.logger.debug(`绑定 ${name} 事件`);
        });
      });
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
        if (!this.guide) {
          const message = ['Commands: '];
          const commands_length = this.commands.length;

          for (let i = 0; i < commands_length; i++) {
            const command = this.commands[i];
            const { raw_name, desc } = command;

            message.push(`  ${raw_name}  ${desc}`);
          }
          this.guide = message.join('\n');
        }
        ctx.reply(this.guide);
      });
    const versionCommand = new Command<'all'>(this, 'version')
      .description('版本信息')
      .action((ctx) => {
        ctx.reply(`${this.info.folder} v${this.ver}`);
      });

    setTimeout(() => {
      this.commands.push(updateCommand);
      this.commands.push(helpCommand);
      this.commands.push(versionCommand);
    });
  }

  private onMessage(bot: Bot, event: PluginMessageEvent) {
    const disable = bot.getDisable();

    if (disable.includes(this.info.name)) {
      return;
    }
    const { name, data } = event;
    const context: any = data;

    // message 事件才会有 permission_level
    if (name.startsWith('message')) {
      context.permission_level = bot.getPermissionLevel(data as BotEvent<'message'>);
    }

    // 所有 group 相关事件都会有 setting
    if (context.group_id) {
      context.setting = bot.getSetting(context.group_id);
    }
    context.bot = bot;
    context.revise = (key: string, value: string | number | boolean, plugin: string = this.info.name) => {
      return bot.updateOption(context.group_id!, plugin, key, value);
    };
    context.getBot = (uin: number) => this.bl.get(uin);

    this.emit(name, context);
  }

  private onDestroy() {
    this.jobs.forEach((job) => {
      job.stop();
    });
    this.removeAllListeners();

    pluginList.delete(this.info.name);
  }
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
};

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
 * 销毁插件模块
 *
 * @param info - 插件信息
 */
export function destroyPlugin(info: PluginInfo) {
  const { filename, name } = info;
  const module = require.cache[filename];
  const index = module?.parent?.children.indexOf(module);

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

  pluginList.delete(name);
  delete require.cache[filename];
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
    logger.mark(`插件 ${name} 导入成功`);

    return pluginList.get(name)!;
  } catch (error) {
    const message = `import module "${name}" failed, ${(<Error>error).message}`;
    logger.error(`插件 ${name} 导入失败`);

    throw new Error(message);
  }
}

/**
 * 解析插件信息
 * 
 * @param filename - 插件文件路径
 * @returns 插件信息
 */
function parsePluginInfo(filename: string): PluginInfo {
  const regex = /(?<=(\\|\/)(node_modules|plugins)(\\|\/)).+?(?=(\\|\/))/;
  const folder = regex.exec(filename)?.[0] ?? 'kokkoro';
  const name = folder.replace('kokkoro-plugin-', '');
  const local = filename.indexOf('node_modules') === -1;

  return {
    name, folder, filename, local,
  };
}

export function getPluginList(): Map<string, Plugin> {
  return pluginList;
}
