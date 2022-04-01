import { join } from 'path';
import { spawn } from 'child_process';
import { PrivateMessageEvent } from "oicq";
import { Dirent } from 'fs';
import { readdir, mkdir } from 'fs/promises';
import { Job, scheduleJob } from "node-schedule";

import { AllMessageEvent, Bot, addBot, getAllBot } from "./bot";
import { Command, CommandType, ParsedArgv } from "./command";
import { logger } from './util';

// extension list
const el: Map<string, Extension> = new Map();
const extensions_path = join(__workname, 'extensions');
const modules_path = join(__workname, 'node_modules');

export class Extension {
  name: string;
  version: string;
  event!: AllMessageEvent;
  args: ParsedArgv['args'];
  jobs: Job[];
  bots: Map<number, Bot>;
  commands: Map<string, Command>;

  constructor(name: string = '') {
    const { version } = require('../package.json');

    this.name = name;
    this.version = version;
    this.args = [];
    this.jobs = [];
    this.bots = new Map();
    this.commands = new Map();

    const helpCommand = new Command('help', this)
      .description('帮助信息')
      .sugar(/^(帮助|h)$/)
      .action(function () {
        let message = `Commands:`;

        for (const [_, command] of this.commands) {
          const { raw_name, desc } = command;
          message += `\n  ${raw_name}  ${desc}`;
        }
        this.event.reply(message);
      });
    const versionCommand = new Command('version', this)
      .description('版本信息')
      .sugar(/^(版本|ver|v)$/)
      .action(function () {
        const name = this.name || 'kokkoro';
        this.event.reply(`${name}@${this.version}`);
      });

    setTimeout(() => {
      this.commands.set(helpCommand.name, helpCommand);
      this.commands.set(versionCommand.name, versionCommand);
    }, 100);
  }

  command(raw_name: string, types?: CommandType[]) {
    const command = new Command(raw_name, this, types);
    this.commands.set(command.name, command);
    return command;
  }

  schedule(cron: string, callback: (...args: any[]) => any) {
    const job = scheduleJob(cron, callback);

    this.jobs.push(job);
    return this;
  }

  parse(raw_message: string) {
    for (const [_, command] of this.commands) {
      if (command.isMatched(raw_message)) {
        this.args = command.parseArgs(raw_message);
        this.runMatchedCommand(command);
        break;
      }
    }
  }

  bindBot(bot: Bot) {
    const { uin } = bot;

    if (this.bots.has(uin)) {
      throw new Error('怎么可能会有这种报错？');
    }

    this.listenOnline(bot);
    this.listenOffline(bot);
    this.listenMessage(bot);
    this.bots.set(bot.uin, bot);
  }

  getBot() {
    const { self_id } = this.event;
    return this.bots.get(self_id)!;
  }

  getLevel() {
    const self_id = this.event.self_id;
    const bot = this.bots.get(self_id)!;
    const level = bot.getUserLevel(this.event);
    return level;
  }

  private runMatchedCommand(command: Command) {
    if (!command.func) return;
    command.func(...this.args);
  }

  private listenOnline(bot: Bot) {
    bot.on('system.online', () => {
      bot.sendMasterMsg('该账号刚刚从掉线中恢复，现在一切正常');
      bot.logger.info(`${bot.nickname} 刚刚从掉线中恢复，现在一切正常`);
    });
  }

  private listenOffline(bot: Bot) {
    bot.on('system.offline', (event: { message: string }) => {
      bot.logger.info(`${bot.nickname} 已离线，${event.message}`);
    });
  }

  private listenMessage(bot: Bot) {
    bot.on('message', (event: AllMessageEvent) => {
      this.event = event;
      this.parse(event.raw_message);
    });
  }
}

export const extension = new Extension();

//#region restart
extension
  .command('restart')
  .description('重启进程')
  .sugar(/^重启$/)
  .action(function () {
    const level = this.getLevel();

    if (level < 5) {
      return this.event.reply('权限不足');
    }
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

//#region shutdown
extension
  .command('shutdown')
  .description('结束进程')
  .sugar(/^关机$/)
  .action(function () {
    const level = this.getLevel();

    if (level < 5) {
      return this.event.reply('权限不足');
    }
    setTimeout(() => process.exit(0), 1000);
    this.event.reply('お休み♪');
  });
//#endregion

//#region print
extension
  .command('print <message>')
  .description('打印输出信息，一般用作测试')
  .sugar(/^(打印|输出)\s?(?<message>.+)$/)
  .action(function (message: string) {
    this.event.reply(message);
  });
//#endregion

//#region login
extension
  .command('login <uin>', ['private'])
  .description('添加登录新的 qq 账号，默认在项目启动时自动登录')
  .sugar(/^(登录|登陆)\s?(?<uin>[1-9][0-9]{4,11})$/)
  .action(function (uin: number) {
    const bot = this.getBot();
    const level = this.getLevel();

    if (level < 5) {
      return this.event.reply('权限不足');
    }
    addBot.call(bot, uin, <PrivateMessageEvent>this.event);
  });
//#endregion

/**
 * 检索可用扩展
 * 
 * @returns 
 */
export async function findExtension() {
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
  if (el.has(name)) return el.get(name)!;

  let extension_path = '';
  try {
    const { modules, extensions } = await findExtension();

    for (const raw_name of modules) {
      if (raw_name === name || raw_name === 'kokkoro-plugin-' + name) {
        extension_path = join(extensions_path, raw_name);
        break;
      }
    }

    // 匹配 npm 模块
    if (!extension_path) {
      for (const raw_name of extensions) {
        if (raw_name === name || raw_name === 'kokkoro-plugin-' + name) {
          extension_path = join(modules_path, raw_name);
          break;
        }
      }
    }
    if (!extension_path) throw new Error('扩展名错误，无法找到此扩展');

    const extension: Extension = require(extension_path);

    el.set(name, extension);
    return extension;
  } catch (error) {
    const { message } = error as Error;

    logger.error(message);
    throw new Error(`Error: import module failed\n${message}`);
  }
}

/**
 * @param name - 扩展名字
 * @param bot - bot 实例
 * @returns 
 */
export async function enableExtension(name: string, bot: Bot) {
  return (await importExtension(name)).bindBot(bot);
}

export function bindExtension() {
  findExtension()
    .then(({ modules, extensions }) => {
      // console.log('modules', modules);
      // console.log('extensions', extensions);
      const all_modules = [...modules, ...extensions];
      const modules_length = all_modules.length;

      if (modules_length) {
        const bl = getAllBot();

        for (let i = 0; i < modules_length; i++) {
          const name = all_modules[i];

          for (const [bot] of bl) {
            enableExtension(name, bot);
          }
        }
      }
    })
}
