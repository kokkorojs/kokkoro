import { GroupMessageEvent, PrivateMessageEvent } from 'oicq';

import { Bot, UserLevel } from './bot';
import { Extension } from './extension';
import { AllMessageEvent } from './events';

export type CommandMessageType = 'all' | 'group' | 'private';

interface CommandArg {
  required: boolean
  value: string
  variadic: boolean
}

export interface commandEvent {
  'all': AllMessageEvent;
  'group': GroupMessageEvent;
  'private': PrivateMessageEvent;
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

function parseGroups(groups: { [key: string]: string; } = {}): string[] {
  const raw_args = [];
  const keys = Object.keys(groups);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const args = groups[key].split(' ');

    raw_args.push(...args);
  }
  return raw_args;
}

export class Command<T extends keyof commandEvent = CommandMessageType> {
  name: string;
  desc: string;
  args: CommandArg[];
  min_level: UserLevel;
  max_level: UserLevel;
  bot!: Bot;
  event!: commandEvent[T];
  regex?: RegExp;
  func?: (...args: any[]) => any;
  stop?: (...args: any[]) => any;

  constructor(
    public message_type: T,
    public raw_name: string,
    public extension: Extension,
  ) {
    this.name = removeBrackets(raw_name);
    this.args = findAllBrackets(raw_name);
    this.desc = '';
    this.min_level = 0;
    this.max_level = 6;
  }

  description(desc: string) {
    this.desc = desc;
    return this;
  }

  sugar(regex: RegExp) {
    this.regex = regex;
    return this;
  }

  action(callback: (this: this, ...args: any[]) => any) {
    this.func = callback;
    return this;
  }

  prevent(callback: (this: this, ...args: any[]) => any) {
    this.stop = callback;
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

  getLevel(): UserLevel {
    return this.bot.getUserLevel(this.event);
  }

  isApply(): boolean {
    const group_id = (this.event as GroupMessageEvent).group_id;
    const option = this.bot.getOption(group_id);

    return option[this.extension.name].apply;
  }

  isMatched(event: commandEvent[T]) {
    const { raw_message, message_type, self_id } = event;

    // 匹配事件类型
    if (this.message_type !== 'all' && this.message_type !== message_type) {
      return false;
    }

    this.event = event;
    this.bot = this.extension.getBot(self_id)!;

    // 空字段指令匹配
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

  parseArgs(raw_message: string): (string | string[])[] {
    let args_index = 0;
    let raw_args_index = 0;

    const raw_args: string[] = [];
    const args: (string | string[])[] = [];

    if (this.regex && this.regex.test(raw_message)) {
      const { groups } = this.regex.exec(raw_message)!;
      raw_args.push(...parseGroups(groups));
    } else {
      raw_args.push(
        ...raw_message
          .replace(new RegExp(this.extension.name), '')
          .replace(new RegExp(this.name), '')
          .split(' ')
          .filter(i => i !== '')
      );
    }

    for (; args_index < this.args.length; args_index++) {
      const { variadic } = this.args[args_index];

      if (!variadic) {
        args.push(raw_args[raw_args_index]);
        raw_args_index++;
      } else {
        const argv = [];
        /**
         * TODO ⎛⎝≥⏝⏝≤⎛⎝ 当 command 传入多字段时优化
         * 
         * (raw_args.length - args_index)
         * 例如 command('test <...argv1> <argv2>')
         */
        for (; raw_args_index < raw_args.length; raw_args_index++) {
          argv.push(raw_args[raw_args_index]);
        }
        args.push(argv);
      }
    }
    return args;
  }
}

// // all_command.group = {
// //   async list(param, event) {
// //     const { uin } = this;
// //     const { group_id } = event as GroupMessageEvent;

// //     return getList(uin, group_id);
// //   },
// // };

// // all_command.private = {

// //   async plugin() {
// //     const message: string[] = [];

// //     await findAllPlugin()
// //       .then(({ plugin_modules, node_modules, all_plugin }) => {
// //         const plugins = [...plugin_modules, ...node_modules].map(i => i.replace('kokkoro-plugin-', ''));

// //         message.push(`# 当前目录共检索到 ${plugins.length} 个插件\nplugins:`);

// //         for (let plugin_name of plugins) {
// //           const plugin = all_plugin.get(plugin_name);

// //           message.push(`  ${plugin_name}: ${plugin?.roster.has(this.uin) ? 'enable' : 'disable'}`);
// //         }
// //       })
// //       .catch(error => {
// //         message.push(`Error: ${error.message}`);
// //       })

// //     return message.join('\n');
// //   },


// //   async delete(param) {
// //     const uin = +param[0];
// //     const bot = getBot(uin);

// //     if (!bot)
// //       return `Error: 账号输入错误，无法找到该实例`;
// //     if (bot.isOnline()) {
// //       return `Error：此机器人正在登录中，请先注销在删除`;
// //     }
// //     await disableAllPlugin(bot);
// //     await cutBotConfig(uin);

// //     return `Sucess：已删除此机器人实例`;
// //   },
// // };

// // /**
// //  * 添加插件命令
// //  */
// // async function addPluginCommand() {
// //   const { plugin_modules, node_modules } = await findAllPlugin();
// //   const plugins = [...plugin_modules, ...node_modules].map(i => i.replace('kokkoro-plugin-', ''));

// //   for (const plugin_name of plugins) {
// //     all_command.group[plugin_name] = async (param, event, plugin = plugin_name) => {
// //       return setOption([plugin, ...param], <GroupMessageEvent>event);
// //     }
// //   }
// // }

// // addPluginCommand();
