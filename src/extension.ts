import { join } from 'path';
// import { spawn } from 'child_process';
// import { PrivateMessageEvent } from "oicq";
import { Dirent } from 'fs';
import { readdir, mkdir } from 'fs/promises';
// import { Job, scheduleJob } from "node-schedule";
import { EventEmitter } from 'events';

import { AllMessageEvent, Bot, addBot, getBotList } from "./bot";
import { Command } from "./command";
import { getStack, logger } from './util';
// import { KOKKORO_VERSION } from '.';

// // extension list
const el: Map<string, Extension> = new Map();
const extensions_path = join(__workname, 'extensions');
const modules_path = join(__workname, 'node_modules');

export class Extension extends EventEmitter {
  name: string;
  path: string;
  ver: string;
  event!: AllMessageEvent;
  args: Array<string | string[]>;
  //   jobs: Job[];
  bl: Map<number, Bot>;
  commands: Map<string, Command>;
  private listener: (event: AllMessageEvent) => void;

  constructor(name: string = '') {
    super();
    const stack = getStack();
    const path = stack[2].getFileName()!;

    this.name = name;
    this.path = path;
    this.ver = '0.0.0';
    this.args = [];
    //     this.jobs = [];
    this.bl = new Map();
    this.commands = new Map();
    this.listener = (event: AllMessageEvent) => {
      this.event = event;
      this.parse(event.raw_message);
    };
    //     const helpCommand = new Command('help', this)
    //       .description('帮助信息')
    //       .action(function () {
    //         let message = `Commands:`;

    //         for (const [_, command] of this.commands) {
    //           const { raw_name, desc } = command;
    //           message += `\n  ${raw_name}  ${desc}`;
    //         }
    //         this.event.reply(message);
    //       });
    //     const versionCommand = new Command('version', this)
    //       .description('版本信息')
    //       .action(function () {
    //         if (this.name) {
    //           this.event.reply(`${this.name} v${this.ver}`);
    //         } else {
    //           this.event.reply(`kokkoro v${KOKKORO_VERSION}`);
    //         }
    //       });

    //     setTimeout(() => {
    //       this.commands.set('help', helpCommand);
    //       this.commands.set('version', versionCommand);
    //     }, 100);
  }

  command(raw_name: string) {
    const command = new Command(raw_name, this);
    this.commands.set(command.name, command);
    return command;
  }

  //   schedule(cron: string, callback: (...args: any[]) => any) {
  //     const job = scheduleJob(cron, callback);

  //     this.jobs.push(job);
  //     return this;
  //   }

  parse(raw_message: string) {
    for (const [_, command] of this.commands) {
      if (command.isMatched(raw_message)) {
        this.args = command.parseArgs(raw_message);
        this.runCommand(command);
        // this.emit(`extension.${this.name}`, raw_message)
        // break;
      }
    }
  }

  version(ver: string) {
    this.ver = ver;
  }

  bind(bot: Bot) {
    const { uin } = bot;

    if (this.bl.has(uin)) {
      throw new Error('jesus, how the hell did you get in here?');
    }

    bot.on('message', this.listener);
    this.bl.set(uin, bot);
    this.once('extension.unbind', () => bot.off('message', this.listener));
  }

  unbind(bot: Bot) {
    const { uin } = bot;

    if (!this.bl.has(uin)) {
      throw new Error('jesus, how the hell did you get in here?');
    }

    this.bl.delete(uin);
    this.emit('extension.unbind');
  }

  getBot() {
    const { self_id } = this.event;
    return this.bl.get(self_id)!;
  }

  getLevel() {
    const self_id = this.event.self_id;
    const bot = this.bl.get(self_id)!;
    const level = bot.getUserLevel(this.event);
    return level;
  }

  destroy() {
    for (const [_, bot] of this.bl) {
      this.unbind(bot);
    }
    el.delete(this.name);

    const module = require.cache[this.path]!;
    const index = module.parent?.children.indexOf(module)!;

    if (index >= 0) {
      module.parent?.children.splice(index, 1);
    }

    for (const path in require.cache) {
      if (require.cache[path]?.id.startsWith(module.path)) {
        delete require.cache[path]
      }
    }

    delete require.cache[this.path];
  }

  private runCommand(command: Command) {
    if (!command.func) return;
    command.func(...this.args);
  }
}

export const extension = new Extension();

extension
  .command('test')
  .description('测试')
  .sugar(/^测试$/)
  .action(function () {
    console.log('test...')
  });

// //#region restart
// extension
//   .command('restart')
//   .description('重启进程')
//   .sugar(/^重启$/)
//   .action(function () {
//     const level = this.getLevel();

//     if (level < 5) {
//       return this.event.reply('权限不足');
//     }
//     setTimeout(() => {
//       spawn(
//         process.argv.shift()!,
//         process.argv,
//         {
//           cwd: __workname,
//           detached: true,
//           stdio: 'inherit',
//         }
//       ).unref();
//       process.exit(0);
//     }, 1000);

//     this.event.reply('またね♪');
//   });
// //#endregion

// //#region shutdown
// extension
//   .command('shutdown')
//   .description('结束进程')
//   .sugar(/^关机$/)
//   .action(function () {
//     const level = this.getLevel();

//     if (level < 5) {
//       return this.event.reply('权限不足');
//     }
//     setTimeout(() => process.exit(0), 1000);
//     this.event.reply('お休み♪');
//   });
// //#endregion

// //#region print
// extension
//   .command('print <message>')
//   .description('打印输出信息，一般用作测试')
//   .sugar(/^(打印|输出)\s?(?<message>.+)$/)
//   .action(function (message: string) {
//     this.event.reply(message);
//   });
// //#endregion



// //#region login
// extension
//   .command('login <uin>', ['private'])
//   .description('添加登录新的 qq 账号，默认在项目启动时自动登录')
//   .sugar(/^(登录|登陆)\s?(?<uin>[1-9][0-9]{4,11})$/)
//   .action(function (uin: number) {
//     const bot = this.getBot();
//     const level = this.getLevel();

//     if (level < 5) {
//       return this.event.reply('权限不足');
//     }
//     addBot.call(bot, uin, <PrivateMessageEvent>this.event);
//   });
// //#endregion

//#region reload
extension
  .command('reload <name>')
  .description('重载扩展')
  // .sugar(/^$/)
  .action(function (name: string) {
    const bot = this.getBot();
    reloadExtension(name, bot);
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
  if (el.has(name)) return el.get(name)!;

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

    const { extension } = require(extension_path) as { extension: Extension };

    if (extension instanceof Extension) {
      el.set(name, extension);
      return extension;
    }
    throw new Error('Extension not instantiated');
  } catch (error) {
    const { message } = error as Error;

    logger.error(message);
    throw new Error(`import module failed, ${message}`);
  }
}

/**
 * 获取扩展实例
 * 
 * @param {string} name - 扩展名
 * @returns {Extension} 扩展实例
 */
function getExtension(name: string): Extension {
  if (!el.has(name)) {
    throw new Error('尚未导入此扩展');
  }
  return el.get(name)!;
}

/**
 * 重载扩展
 * 
 * @param {string} name - 扩展名
 * @returns 
 */
function reloadExtension(name: string, bot: Bot) {
  const extension = getExtension(name);
  const bl = [...extension.bl];

  extension.destroy();
  importExtension(name).then(ext => {
    for (const [_, bot] of bl) {
      ext.bind(bot);
    }
  })
}

/**
 * 绑定扩展 bot
 * 
 * @param name - 扩展名字
 * @param bot - bot 实例
 * @returns 
 */
async function bindBot(name: string, bot: Bot) {
  return (await importExtension(name)).bind(bot);
}

/**
 * 解绑 bot 扩展
 * 
 * @param name - 扩展名字
 * @param bot - bot 实例
 * @returns 
 */
function unbindBot(name: string, bot: Bot) {
  return getExtension(name).unbind(bot);
}

export async function bindExtension() {
  const { modules, extensions } = await findExtension();
  const all_modules = [...modules, ...extensions];
  const modules_length = all_modules.length;

  if (modules_length) {
    const bl = getBotList();

    for (let i = 0; i < modules_length; i++) {
      const name = all_modules[i];

      for (const [_, bot] of bl) {
        await bindBot(name, bot);
      }
    }
  }
  return el.size;
}
