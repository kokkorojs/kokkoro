// import { stringify } from 'yaml';
// import { spawn } from 'child_process';
// import { GroupMessageEvent, PrivateMessageEvent } from 'oicq';
// import { cutBotConfig, getConfig } from './config';
// import { getList, setOption } from './setting';
// import { addBot, AllMessageEvent, Bot, getAllBot, getBot } from './bot';
// import { enablePlugin, disablePlugin, reloadPlugin, findAllPlugin, disableAllPlugin } from './plugin';
import { Job, scheduleJob, JobCallback } from 'node-schedule';

import { UserLevel } from './bot';
import { Extension } from './extension';

export type CommandMessageType = 'all' | 'group' | 'private';

interface CommandArg {
  required: boolean
  value: string
  variadic: boolean
}

// export interface ParsedArgv {
//   args: Array<string | string[]>;
//   options: {
//     [k: string]: any
//   }
// }

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

function parseGroups(groups: { [key: string]: string; } = {}) {
  const raw_args = [];
  const keys = Object.keys(groups);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const args = groups[key].split(' ');

    raw_args.push(...args);
  }
  return raw_args;
}

export class Command {
  name: string;
  desc: string;
  jobs: Job[];
  args: CommandArg[];
  min_level: UserLevel;
  max_level: UserLevel;
  message_type: CommandMessageType;
  regex?: RegExp;
  func?: (...args: any[]) => any;

  constructor(
    public raw_name: string,
    public extension: Extension,
  ) {
    this.name = removeBrackets(raw_name);
    this.desc = '';
    this.jobs = [];
    this.args = findAllBrackets(raw_name);
    this.min_level = 0;
    this.max_level = 6;
    this.message_type = 'all';
    // this.extension.on(`extension.${this.extension.name}`, (raw_message: string) => {
    //   this.func();
    // });
  }

  description(desc: string) {
    this.desc = desc;
    return this;
  }

  sugar(regex: RegExp) {
    this.regex = regex;
    return this;
  }

  message(message_type: CommandMessageType) {
    this.message_type = message_type;
    return this;
  }

  action(callback: (this: Extension, ...args: any[]) => any) {
    this.func = callback.bind(this.extension);
    return this;
  }

  limit(min_level: UserLevel, max_level: UserLevel = 6) {
    if (min_level > max_level) {
      throw new Error('min level be greater than max level');
    }
    this.min_level = min_level;
    this.max_level = max_level;

    return this;
  }

  schedule(cron: string, func: JobCallback) {
    const job = scheduleJob(cron, func);

    this.jobs.push(job);
    return this;
  }

  clearSchedule() {
    for (const job of this.jobs) {
      job.cancel();
    }
  }

  isMatched() {
    const { message_type } = this.extension.event;

    // 匹配事件类型
    if (this.message_type !== 'all' && this.message_type !== message_type) {
      return false;
    }
    // 空字段指令匹配
    const raw_message = this.extension.event.raw_message;
    const raw_name = raw_message.split(' ');

    if (this.extension.name === '') {
      raw_name.unshift('');
    }
    let [extension_name, command_name] = raw_name;

    // 语法糖解析
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
      const { groups } = this.regex.exec(raw_message)!;
      raw_args = parseGroups(groups);
    } else {
      raw_args = raw_message
        .replace(new RegExp(this.extension.name), '')
        .replace(new RegExp(this.name), '')
        .split(' ')
        .filter(i => i !== '');
    }

    for (; args_index < this.args.length; args_index++) {
      const { variadic } = this.args[args_index];

      if (!variadic) {
        args.push(raw_args[raw_args_index]);
        raw_args_index++;
      } else {
        const argc = [];
        // TODO ⎛⎝≥⏝⏝≤⎛⎝ 当 command 传入多字段时优化 (raw_args.length - args_index)
        for (; raw_args_index < raw_args.length; raw_args_index++) {
          argc.push(raw_args[raw_args_index]);
        }
        args.push(argc);
      }
    }
    return args;
  }
}

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

// all_command.group = {
//   async list(param, event) {
//     const { uin } = this;
//     const { group_id } = event as GroupMessageEvent;

//     return getList(uin, group_id);
//   },
// };

// all_command.private = {

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
