// import { stringify } from 'yaml';
// import { spawn } from 'child_process';
// import { GroupMessageEvent, PrivateMessageEvent } from 'oicq';
// import { HELP_ALL, KOKKORO_VERSION } from './help';
// import { cutBotConfig, getConfig } from './config';
// import { getList, setOption } from './setting';
// import { addBot, AllMessageEvent, Bot, getAllBot, getBot } from './bot';
// import { enablePlugin, disablePlugin, reloadPlugin, findAllPlugin, disableAllPlugin } from './plugin';
import { EventEmitter } from 'events';

interface CommandArg {
  required: boolean
  value: string
  variadic: boolean
}

interface ParsedArgv {
  args: Array<string | string[]>;
  options: {
    [k: string]: any
  }
}

function removeBrackets(name: string): string {
  return name.replace(/[<[].+/, '').trim();
}

function findAllBrackets(name: string) {
  const res = [];
  const ANGLED_BRACKET_RE_GLOBAL = /<([^>]+)>/g
  const SQUARE_BRACKET_RE_GLOBAL = /\[([^\]]+)\]/g

  const parse = (match: string[]) => {
    let variadic = false;
    let value = match[1];

    if (value.startsWith('...')) {
      value = value.slice(3)
      variadic = true
    }
    return {
      required: match[0].startsWith('<'),
      value,
      variadic,
    }
  }

  let angledMatch
  while ((angledMatch = ANGLED_BRACKET_RE_GLOBAL.exec(name))) {
    res.push(parse(angledMatch))
  }

  let squareMatch
  while ((squareMatch = SQUARE_BRACKET_RE_GLOBAL.exec(name))) {
    res.push(parse(squareMatch))
  }

  return res;
}

class Command {
  name: string;
  desc: string;
  args: CommandArg[];
  regex?: RegExp;
  func?: (...args: any[]) => any;

  constructor(
    public raw_name: string,
    public extension: Extension,
  ) {
    this.name = removeBrackets(raw_name);
    this.args = findAllBrackets(raw_name);
    this.desc = '';
  }

  description(desc: string) {
    this.desc = desc;
    return this;
  }

  sugar(regex: RegExp) {
    this.regex = regex;
    return this;
  }

  action(callback: (...args: any[]) => any) {
    this.func = callback;
    return this;
  }

  isMatched(raw_message: string) {
    let [extension_name, command_name] = raw_message.split(' ');

    if (this.regex && this.regex.test(raw_message)) {
      command_name = this.name;
      extension_name = this.extension.name;
    }
    return this.extension.name === extension_name && this.name === command_name;
  }

  parseArgs(raw_message: string) {
    let raw_args;
    let args_index = 0;
    let raw_args_index = 0;
    const args: Array<string | string[]> = [];

    if (this.regex && this.regex.test(raw_message)) {
      raw_args = this.regex.exec(raw_message)![1].split(' ');
    } else {
      [, , ...raw_args] = raw_message.split(' ');
    }

    for (; args_index < this.args.length; args_index++) {
      const { variadic } = this.args[args_index];

      if (!variadic) {
        args.push(raw_args[raw_args_index]);
        raw_args_index++;
      } else {
        const params = [];

        // TODO 当 command 传入多字段时优化 (raw_args.length - args_index)
        for (; raw_args_index < raw_args.length; raw_args_index++) {
          params.push(raw_args[raw_args_index]);
        }
        args.push(params);
      }
    }
    return args;
  }
}

export class Extension extends EventEmitter {
  name: string;
  commands: Command[];
  args: ParsedArgv['args'];

  constructor(name: string) {
    super();
    this.name = name;
    this.args = [];
    this.commands = [];
  }

  command(raw_name: string) {
    const command = new Command(raw_name, this);
    this.commands.push(command);
    return command;
  }

  parse(raw_message: string) {
    for (const command of this.commands) {
      if (command.isMatched(raw_message)) {
        this.args = command.parseArgs(raw_message);
        this.runMatchedCommand(command);
        this.emit(`extension.${this.name}`, command);
        break;
      }
    }
  }

  runMatchedCommand(command: Command) {
    if (!command.func) return;
    command.func(...this.args);
  }
}

// export type CommandType = 'all' | 'group' | 'private';

// export const all_command: {
//   [type in CommandType]: {
//     [command: string]: (
//       this: Bot,
//       param: ReturnType<typeof parseCommand>['param'],
//       event: AllMessageEvent,
//     ) => Promise<string>
//   }
// } = {
//   all: {},
//   group: {},
//   private: {},
// };

// /**
//  * 解析命令字段
//  * 
//  * @param {string} command - 命令字段
//  * @returns {Object}
//  */
// export function parseCommand(command: string) {
//   const [order, ...param] = command.split(' ');

//   return {
//     order, param,
//   };
// }

// all_command.all = {
//   async version() {
//     return `kokkoro@${KOKKORO_VERSION}`;
//   },

//   async echo(param) {
//     return param.join(' ');
//   },
// };

// all_command.group = {
//   async list(param, event) {
//     const { uin } = this;
//     const { group_id } = event as GroupMessageEvent;

//     return getList(uin, group_id);
//   },
// };

// all_command.private = {
//   async help(param) {
//     const [key] = param;
//     return HELP_ALL[key] ?? HELP_ALL.default;
//   },

//   async config() {
//     const kokkoro_config = getConfig();
//     return stringify(kokkoro_config.bots[this.uin]);
//   },

//   async restart() {
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

//     return `またね♪`;
//   },

//   async shutdown() {
//     setTimeout(() => process.exit(0), 1000);
//     return `お休み♪`;
//   },

//   async enable(param) {
//     const name = param[0];
//     const uin = this.uin;
//     const bot = getBot(uin)!;

//     try {
//       await enablePlugin(name, bot);
//       return `${bot.nickname} (${uin}) 启用插件成功`;
//     } catch (error: any) {
//       return error.message;
//     }
//   },

//   async disable(param) {
//     const name = param[0];
//     const uin = this.uin;
//     const bot = getBot(uin)!;

//     try {
//       await disablePlugin(name, bot);
//       return `${bot.nickname} (${uin}) 禁用插件成功`;
//     } catch (error: any) {
//       return error.message;
//     }
//   },

//   async reload(param) {
//     const name = param[0];
//     const uin = this.uin;
//     const bot = getBot(uin)!;

//     try {
//       await reloadPlugin(name, bot);
//       return `${bot.nickname} (${uin}) 重启插件成功`;
//     } catch (error: any) {
//       return error.message;
//     }
//   },

//   async plugin() {
//     const message: string[] = [];

//     await findAllPlugin()
//       .then(({ plugin_modules, node_modules, all_plugin }) => {
//         const plugins = [...plugin_modules, ...node_modules].map(i => i.replace('kokkoro-plugin-', ''));

//         message.push(`# 当前目录共检索到 ${plugins.length} 个插件\nplugins:`);

//         for (let plugin_name of plugins) {
//           const plugin = all_plugin.get(plugin_name);

//           message.push(`  ${plugin_name}: ${plugin?.roster.has(this.uin) ? 'enable' : 'disable'}`);
//         }
//       })
//       .catch(error => {
//         message.push(`Error: ${error.message}`);
//       })

//     return message.join('\n');
//   },

//   async bot() {
//     const all_bot = getAllBot();
//     const message: string[] = [];

//     for (const [uin, bot] of all_bot) {
//       message.push(`${bot.nickname} (${uin})\n  状　态：${bot.isOnline() ? '在线' : '离线'}\n  群　聊：${bot.gl.size} 个\n  好　友：${bot.fl.size} 个\n  消息量：${bot.stat.msg_cnt_per_min}/分`);
//     }
//     return message.join('\n');
//   },

//   async login(param, event) {
//     const uin = +param[0];
//     const all_bot = getAllBot();

//     switch (true) {
//       case all_bot.has(uin):
//         const bot = all_bot.get(uin);

//         if (bot!.isOnline()) {
//           return 'Error：已经登录过这个账号了';
//         } else {
//           bot!.login();
//           return 'Sucess：已将该账号上线';
//         }
//       case !uin:
//         return 'Error：请输入账号';
//     }
//     addBot.call(this, uin, <PrivateMessageEvent>event);

//     return `>开始登录流程，账号 ${uin}`;
//   },

//   async logout(param) {
//     const uin = +param[0];
//     const bot = getBot(uin);

//     if (!bot) return `Error: 账号输入错误，无法找到该实例`;
//     if (uin === this.uin) return `Error: 该账号为当前 bot 实例，无法下线`;

//     try {
//       await bot.logout();
//     } catch (error: any) {
//       return `Error：${error.message}`;
//     }
//     return `Success：已将该账号下线`;
//   },

//   async delete(param) {
//     const uin = +param[0];
//     const bot = getBot(uin);

//     if (!bot)
//       return `Error: 账号输入错误，无法找到该实例`;
//     if (bot.isOnline()) {
//       return `Error：此机器人正在登录中，请先注销在删除`;
//     }
//     await disableAllPlugin(bot);
//     await cutBotConfig(uin);

//     return `Sucess：已删除此机器人实例`;
//   },
// };

// /**
//  * 添加插件命令
//  */
// async function addPluginCommand() {
//   const { plugin_modules, node_modules } = await findAllPlugin();
//   const plugins = [...plugin_modules, ...node_modules].map(i => i.replace('kokkoro-plugin-', ''));

//   for (const plugin_name of plugins) {
//     all_command.group[plugin_name] = async (param, event, plugin = plugin_name) => {
//       return setOption([plugin, ...param], <GroupMessageEvent>event);
//     }
//   }
// }

// addPluginCommand();
