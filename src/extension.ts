import { join } from 'path';
import { Dirent } from 'fs';
import { readdir, mkdir } from 'fs/promises';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { EventMap, PrivateMessageEvent } from 'oicq';
import { Job, JobCallback, scheduleJob } from 'node-schedule';

import { Listen } from './listen';
import { KOKKORO_VERSION } from '.';
import { AllMessageEvent } from './events';
import { Command, CommandMessageType } from './command';
import { Bot, getBotList, addBot, getBot } from './bot';
import { deepClone, getStack, logger, section } from './util';
import { updateExtensions } from './setting';

const modules_path = join(__workname, 'node_modules');
const extensions_path = join(__workname, 'extensions');
const extension_list: Map<string, Extension> = new Map();

// 扩展选项
export interface Option {
  // 锁定，默认 false
  lock: boolean;
  // 开关，默认 true
  apply: boolean;
  // 其它设置
  [param: string]: string | number | boolean | Array<string | number>;
}

export class Extension extends EventEmitter {
  public name: string;
  public ver: string;
  public path: string;

  private option: Option;
  private args: (string | string[])[];
  private jobs: Job[];
  private bot_list: Map<number, Bot>;
  private events: Set<string>;
  private command_list: Map<string, Command>;
  private listen_list: Map<string, Listen>

  constructor(name: string = '', option: Option = { apply: true, lock: false }) {
    super();
    const stack = getStack();
    const path = stack[2].getFileName()!;
    this.name = name;
    this.path = path;
    this.ver = '0.0.0';
    this.option = option;
    this.args = [];
    this.jobs = [];
    this.bot_list = new Map();
    this.events = new Set();
    this.command_list = new Map();
    this.listen_list = new Map();

    //#region 帮助指令
    const helpCommand = new Command('help', this).type('all')
      .description('帮助信息')
      .action(function () {
        const message = ['Commands: '];

        for (const [_, command] of this.extension.command_list) {
          const { raw_name, desc } = command;
          message.push(`  ${raw_name}  ${desc}`);
        }
        this.event.reply(message.join('\n'));
      });
    //#endregion
    //#region 版本指令
    const versionCommand = new Command('version', this).type('all')
      .description('版本信息')
      .action(function () {
        const extension = this.extension;

        if (extension.name) {
          this.event.reply(`${extension.name} v${extension.ver}`);
        } else {
          this.event.reply(`kokkoro v${KOKKORO_VERSION}`);
        }
      });
    //#endregion

    this.parse = this.parse.bind(this);
    this.trigger = this.trigger.bind(this);
    this.on('extension.bind', this.bindEvents);
    this.command_list.set(helpCommand.name, helpCommand);
    this.command_list.set(versionCommand.name, versionCommand);
  }

  command(raw_name: string, message_type: CommandMessageType = 'all') {
    const command = new Command(raw_name, this).type(message_type);

    this.events.add('message');
    this.command_list.set(command.name, command);
    return command;
  }

  listen<T extends keyof EventMap>(event_name: T) {
    const listener = new Listen(event_name, this);

    this.events.add(event_name);
    this.listen_list.set(listener.name, listener);
    return listener;
  }

  schedule(cron: string, func: JobCallback) {
    const job = scheduleJob(cron, func);

    this.jobs.push(job);
    return this;
  }

  private clearSchedule() {
    for (const job of this.jobs) {
      job.cancel();
    }
  }

  // 指令解析器
  private parse(event: AllMessageEvent) {
    for (const [_, command] of this.command_list) {
      if (command.isMatched(event)) {
        this.args = command.parseArgs(event.raw_message);
        this.runCommand(command);
        // TODO ⎛⎝≥⏝⏝≤⎛⎝ 扩展事件
        // this.emit(`extension.${this.name}`, event);
      }
    }
  }

  // 事件触发器
  private trigger(event: any) {
    for (const [_, listen] of this.listen_list) {
      listen.func && listen.func(event);
    }
  }

  // 执行指令
  private runCommand(command: Command) {
    const args_length = this.args.length;

    for (let i = 0; i < args_length; i++) {
      const { required, value } = command.args[i];
      const argv = this.args[i];

      if (required && !argv) {
        return command.event.reply(`Error: <${value}> cannot be empty`);
      } else if (required && !argv.length) {
        return command.event.reply(`Error: <...${value}> cannot be empty`);
      }
    }
    const level = command.getLevel();

    if (level < command.min_level && level < command.max_level) {
      command.event.reply('权限不足');
    } else if (command.message_type !== 'private' && command.stop && !command.isApply()) {
      command.stop();
    } else if (command.func) {
      command.func(...this.args);
    }
  }

  // 绑定 bot 事件
  bindEvents(bot: Bot): void {
    for (const event_name of this.events) {
      if (event_name === 'message') {
        bot.on(event_name, this.parse);
        this.once('extension.unbind', () => bot.off(event_name, this.parse));
      } else {
        bot.on(event_name, this.trigger);
        this.once('extension.unbind', () => bot.off(event_name, this.trigger));
      }
    }
  }

  getOption() {
    return deepClone(this.option);
  }

  getBot(uin: number): Bot | undefined {
    return this.bot_list.get(uin);
  }

  getBotList(): Map<number, Bot> {
    return this.bot_list;
  }

  bindBot(bot: Bot): this {
    const { uin } = bot;

    if (this.bot_list.has(uin)) {
      throw new Error('jesus, how the hell did you get in here?');
    }
    this.bot_list.set(uin, bot);
    this.emit('extension.bind', bot);
    return this;
  }

  unbindBot(bot: Bot): void {
    const { uin } = bot;

    if (!this.bot_list.has(uin)) {
      throw new Error('jesus, how the hell did you get in here?');
    }
    this.clearSchedule();
    this.bot_list.delete(uin);
    this.emit('extension.unbind');
  }

  // 销毁
  destroy() {
    for (const [_, bot] of this.bot_list) {
      this.unbindBot(bot);
    }
    this.off('extension.bind', this.bindEvents);
    extension_list.delete(this.name);
    destroyExtension(this.path);
  }
}

export const extension = new Extension();

//#region 测试
extension
  .command('test')
  .description('测试')
  .sugar(/^(测试)$/)
  .action(function () {

  });
//#endregion

//#region 重启
extension
  .command('restart')
  .description('重启进程')
  .limit(5)
  .sugar(/^重启$/)
  .action(function () {
    setTimeout(() => {
      spawn(
        process.argv.shift()!,
        process.argv,
        {
          cwd: __workname,
          detached: true,
          stdio: 'inherit',
        }
      ).unref();
      process.exit(0);
    }, 1000);

    this.event.reply('またね♪');
  });
//#endregion

//#region 关机
extension
  .command('shutdown')
  .description('结束进程')
  .limit(5)
  .sugar(/^关机$/)
  .action(function () {
    setTimeout(() => process.exit(0), 1000);
    this.event.reply('お休み♪');
  });
//#endregion

//#region 打印
extension
  .command('print <message>')
  .description('打印输出信息，一般用作测试')
  .sugar(/^(打印|输出)\s?(?<message>.+)$/)
  .action(function (message: string) {
    this.event.reply(message);
  });
//#endregion

//#region 状态
extension
  .command('bot')
  .description('查看 bot 运行信息')
  .sugar(/^(状态)$/)
  .action(function () {
    const bot_list = getBotList();
    const message: string[] = [];

    for (const [uin, bot] of bot_list) {
      const nickname = bot.nickname ?? 'unknown';
      const state = bot.isOnline() ? '在线' : '离线';
      const group_count = `${bot.gl.size} 个`;
      const friend_count = `${bot.fl.size} 个`;
      const message_min_count = `${bot.stat.msg_cnt_per_min}/分`;
      const bot_info = `${nickname}(${uin})
  状　态：${state}
  群　聊：${group_count}
  好　友：${friend_count}
  消息量：${message_min_count}`;

      message.push(bot_info);
    }
    this.event.reply(message.join('\n'));
  });
//#endregion

//#region login
extension
  .command('login <uin>', 'private')
  .description('添加登录新的 qq 账号，默认在项目启动时自动登录')
  .limit(5)
  .sugar(/^(登录|登陆)\s?(?<uin>[1-9][0-9]{4,11})$/)
  .action(function (uin: string) {
    // TODO ⎛⎝≥⏝⏝≤⎛⎝ 优化
    const bot_list = getBotList();

    if (!bot_list.has(+uin)) {
      addBot.call(this.bot, +uin, <PrivateMessageEvent>this.event);
    } else {
      const bot = getBot(+uin)!;

      if (bot.isOnline()) {
        this.event.reply('Error: 已经登录过这个账号了');
      } else {
        bot
          .on('system.login.qrcode', (event) => {
            this.event.reply([
              section.image(event.image),
              '\n使用手机 QQ 扫码登录，输入 “cancel” 取消登录',
            ]);

            const listenLogin = (event: PrivateMessageEvent) => {
              if (event.sender.user_id === this.event.sender.user_id && event.raw_message === 'cancel') {
                bot.terminate();
                clearInterval(interval_id);
                this.event.reply('登录已取消');
              }
            }
            const interval_id = setInterval(async () => {
              const { retcode } = await bot.queryQrcodeResult();

              if (retcode === 0 || ![48, 53].includes(retcode)) {
                bot.login();
                clearInterval(interval_id);
                retcode && this.event.reply(`Error: 错误代码 ${retcode}`);
                bot.off('message.private', listenLogin);
              }
            }, 2000);

            bot.on('message.private', listenLogin)
          })
          .once('system.login.error', data => {
            bot.terminate();
            this.event.reply(`Error: ${data.message}`);
          })
          .once('system.online', () => {
            this.event.reply('Sucess: 已将该账号上线');
          })
          .login();
      }
    }
  });
//#endregion

//#region logout
extension
  .command('logout <uin>', 'private')
  .description('下线已登录的 qq 账号')
  .limit(5)
  .sugar(/^(下线|登出)\s?(?<uin>[1-9][0-9]{4,11})$/)
  .action(function (uin: string) {
    let message = '';
    const bot = getBot(+uin);

    switch (true) {
      case !bot:
        message = 'Error: 账号输入错误，无法找到该 bot 实例';
        break;
      case +uin === this.bot.uin:
        message = 'Error: 该账号为当前 bot 实例，无法下线';
        break;
    }

    if (message) {
      return this.event.reply(message);
    }
    bot!.logout()
      .then(() => {
        this.event.reply('Success: 已将该账号下线');
      })
      .catch(error => {
        this.event.reply(`Error: ${error.message}`);
      })
  });
//#endregion

//#region enable
extension
  .command('enable <name>')
  .description('启用扩展')
  .limit(5)
  .sugar(/^(启用)\s?(?<name>.+)$/)
  .action(function (name: string) {
    enableExtension(name)
      .then(() => this.event.reply('启用扩展成功'))
      .catch(error => this.event.reply(`Error: ${error.message}`))
  });
//#endregion

//#region disable
extension
  .command('disable <name>')
  .description('禁用扩展')
  .limit(5)
  .sugar(/^(禁用)\s?(?<name>.+)$/)
  .action(function (name: string) {
    disableExtension(name)
      .then(() => this.event.reply('禁用扩展成功'))
      .catch(error => this.event.reply(`Error: ${error.message}`))
  });
//#endregion

//#region reload
extension
  .command('reload <name>')
  .description('重载扩展')
  .limit(5)
  .sugar(/^(重载)\s?(?<name>.+)$/)
  .action(function (name: string) {
    reloadExtension(name)
      .then(() => this.event.reply('重载扩展成功'))
      .catch(error => this.event.reply(error.message))
  });
//#endregion

/**
 * 检索可用扩展
 * 
 * @returns 
 */
async function findExtension() {
  const modules_dir: Dirent[] = [];
  const extensions_dir: Dirent[] = [];
  const modules: string[] = [];
  const extensions: string[] = [];

  try {
    const dirs = await readdir(extensions_path, { withFileTypes: true });
    extensions_dir.push(...dirs);
  } catch (error) {
    await mkdir(extensions_path);
  }

  for (const dir of extensions_dir) {
    if (dir.isDirectory() || dir.isSymbolicLink()) {
      try {
        const extension_path = join(extensions_path, dir.name);

        require.resolve(extension_path);
        extensions.push(dir.name);
      } catch { }
    }
  }

  try {
    const dirs = await readdir(modules_path, { withFileTypes: true });
    modules_dir.push(...dirs);
  } catch (err) {
    await mkdir(modules_path);
  }

  for (const dir of modules_dir) {
    if (dir.isDirectory() && dir.name.startsWith('kokkoro-plugin-')) {
      try {
        const module_path = join(modules_path, dir.name);

        require.resolve(module_path);
        modules.push(dir.name);
      } catch { }
    }
  }

  return {
    modules, extensions,
  }
}

/**
 * 导入扩展模块
 *
 * @param {string} name - 扩展名
 * @returns {Extension} 扩展实例对象
 */
async function importExtension(name: string) {
  if (extension_list.has(name)) return extension_list.get(name)!;

  let extension_path = '';
  try {
    const { modules, extensions } = await findExtension();

    for (const raw_name of extensions) {
      if (raw_name === name || raw_name === 'kokkoro-plugin-' + name) {
        extension_path = join(extensions_path, raw_name);
        break;
      }
    }

    // 匹配 npm 模块
    if (!extension_path) {
      for (const raw_name of modules) {
        if (raw_name === name || raw_name === 'kokkoro-plugin-' + name) {
          extension_path = join(modules_path, raw_name);
          break;
        }
      }
    }
    if (!extension_path) throw new Error('cannot find this extension');

    const { extension } = require(extension_path) as { extension?: Extension };

    if (extension instanceof Extension) {
      extension_list.set(name, extension);
      return extension;
    }
    throw new Error(`Extension not instantiated`);
  } catch (error) {
    const message = `"${name}" import module failed, ${(error as Error).message}`;

    logger.error(message);
    destroyExtension(require.resolve(extension_path));
    throw new Error(message);
  }
}

/**
 * 销毁扩展
 * 
 * @param extension_path - 扩展路径
 * @returns 
 */
function destroyExtension(extension_path: string) {
  const module = require.cache[extension_path];
  const index = module?.parent?.children.indexOf(module);

  if (!module) {
    return;
  }
  if (index && index >= 0) {
    module.parent?.children.splice(index, 1);
  }

  for (const path in require.cache) {
    if (require.cache[path]?.id.startsWith(module.path)) {
      delete require.cache[path]
    }
  }

  delete require.cache[extension_path];
}

/**
 * 获取扩展实例
 * 
 * @param {string} name - 扩展名
 * @returns {Extension} 扩展实例
 */
function getExtension(name: string): Extension {
  if (!extension_list.has(name)) {
    throw new Error('尚未导入此扩展');
  }
  return extension_list.get(name)!;
}

export function getExtensionList(): Map<string, Extension> {
  return extension_list;
}

/**
 * 启用扩展
 * 
 * @param name - 扩展名
 */
async function enableExtension(name: string) {
  // TODO ⎛⎝≥⏝⏝≤⎛⎝

  // if (extension_list.has(name)) {
  //   throw new Error('已启用当前扩展');
  // }
  // const bot_list = getBotList();

  // for (const [_, bot] of bot_list) {
  //   await bindBot(name, bot);
  // }
}

/**
 * 禁用扩展
 * 
 * @param name - 扩展名
 */
async function disableExtension(name: string) {
  // if (!extension_list.has(name)) {
  //   throw new Error('未启用当前扩展');
  // }
  // const bot_list = getBotList();

  // for (const [_, bot] of bot_list) {
  //   unbindBot(name, bot);
  // }
  // extension_list.delete(name)

  // TODO ⎛⎝≥⏝⏝≤⎛⎝

  // const extensions = [...extension_list.keys()].filter(i => i !== name);

  // updateExtensions(uin, extensions);
}

/**
 * 重载扩展
 * 
 * @param {string} name - 扩展名
 * @returns 
 */
async function reloadExtension(name: string) {
  const extension = getExtension(name);
  const bots = [...extension.getBotList()];

  try {
    extension.destroy();
    const ext = await importExtension(name);

    for (const [_, bot] of bots) {
      ext.bindBot(bot);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * 绑定扩展 bot
 * 
 * @param name - 扩展名字
 * @param bot - bot 实例
 * @returns 
 */
async function bindBot(name: string, bot: Bot) {
  try {
    return (await importExtension(name)).bindBot(bot);
  } catch (error) {
    throw error;
  }
}

/**
 * 解绑 bot 扩展
 * 
 * @param name - 扩展名字
 * @param bot - bot 实例
 * @returns 
 */
function unbindBot(name: string, bot: Bot) {
  return getExtension(name).unbindBot(bot);
}

/**
 * 导入所有扩展模块
 * 
 * @returns 
 */
export async function importAllExtension() {
  const { modules, extensions } = await findExtension();
  const all_modules = [...modules, ...extensions];
  const modules_length = all_modules.length;

  if (modules_length) {
    for (let i = 0; i < modules_length; i++) {
      const name = all_modules[i];

      try {
        await importExtension(name);
      } catch { }
    }
  }
  return extension_list;
}
