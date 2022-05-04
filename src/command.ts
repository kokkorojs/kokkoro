import { GroupMessageEvent, PrivateMessageEvent } from 'oicq';

import { UserLevel } from './bot';
import { Action } from './action';
import { Plugin } from './plugin';
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
  private regex?: RegExp;
  private min_level: UserLevel;
  private max_level: UserLevel;

  public name: string;
  public desc: string;
  public args: CommandArg[];
  public func?: (...args: any[]) => any;
  public stop?: (...args: any[]) => any;

  constructor(
    public message_type: T,
    public raw_name: string,
    public plugin: Plugin,
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

  action(callback: (this: Action<T>, ...args: any[]) => any) {
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

  isLimit(level: UserLevel): boolean {
    return level < this.min_level && level < this.max_level;
  }

  isMatched(event: commandEvent[T]) {
    const { raw_message, message_type } = event;

    // 匹配事件类型
    if (this.message_type !== 'all' && this.message_type !== message_type) {
      return false;
    }
    const raw_name = raw_message.trim().split(' ');

    // 空字段指令匹配
    if (this.plugin.prefix === '') {
      raw_name.unshift('');
    }
    let [prefix, command_name] = raw_name;

    // 语法糖解析
    if (this.regex && this.regex.test(raw_message)) {
      command_name = this.name;
      prefix = this.plugin.prefix;
    }
    return this.plugin.prefix === prefix && this.name === command_name;
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
          .replace(new RegExp(this.plugin.prefix), '')
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
         * 例如 command('test <...argv1> <argv2>') 时，argv2 是 unfettered
         * 暂定解决方案， (raw_args.length - args_index)
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
