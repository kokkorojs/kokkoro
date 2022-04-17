import { GroupMessageEvent, PrivateMessageEvent } from 'oicq';

import { Bot, UserLevel } from './bot';
import { Option, Plugin } from './plugin';
import { AllMessageEvent } from './events';
import { writeSetting } from './setting';

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

  public bot!: Bot;
  public option?: Option;
  public event!: commandEvent[T];
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

  /**
   * 修改插件设置
   * 
   * @param key - 参数键
   * @param value - 参数值
   */
  async update(key: string, value: string): Promise<string> {
    const plugin_name = this.plugin.getName();

    if (this.event.message_type !== 'group' || plugin_name === 'kokkoro') {
      throw new Error('嘿，你不该来这里的 o(*≧д≦)o!!');
    }
    const group_id = this.event.group_id;
    const option = this.bot.getOption(group_id, plugin_name);
    const old_value = option[key];

    let message = '';
    let new_value: string | number | boolean | Array<string | number>;

    switch (true) {
      case ['true', 'false'].includes(value):
        new_value = value === 'true';
        break;
      case /^(-?[1-9]\d*|0)$/.test(value):
        new_value = +value;
        break;
      default:
        new_value = value;
        break;
    }

    // 校验参数是否合法
    switch (true) {
      case old_value === new_value:
        message = `Error: "${key}" 当前值相等`;
        break;
      case !Array.isArray(old_value) && typeof old_value !== typeof new_value:
        if (old_value) {
          message = `Error: "${key}" 应为 ${typeof old_value} 类型值`;
        } else {
          message = `Error: "${key}" is not defined`;
        }
        break;
      case Array.isArray(old_value) && !old_value.includes(new_value as string | number):
        message = `Error: 属性 "${key}" 的合法值为 [${(old_value as (string | number)[]).join(', ')}]`;
        break;
    }

    if (message) {
      throw new Error(message);
    }

    if (Array.isArray(old_value)) {
      new_value = old_value.sort(i => i === new_value ? -1 : 0);
    }
    option[key] = new_value;

    try {
      await writeSetting(this.bot.uin);
      return `${plugin_name}:\n  ${key}: ${old_value} -> ${new_value}`;
    } catch (error) {
      throw error;
    }
  }

  getLevel(): UserLevel {
    return this.bot.getUserLevel(this.event);
  }

  isApply(): boolean {
    return this.option!.apply;
  }

  isLimit(): boolean {
    const level = this.getLevel();
    return level < this.min_level && level < this.max_level;
  }

  isMatched(event: commandEvent[T]) {
    const { raw_message, message_type, self_id } = event;

    // 匹配事件类型
    if (this.message_type !== 'all' && this.message_type !== message_type) {
      return false;
    }
    const bot = this.plugin.getBot(self_id)!;
    const group_id = (event as GroupMessageEvent).group_id;
    const plugin_name = this.plugin.getName();

    this.event = event;
    this.bot = bot;
    this.option = group_id ? bot.getOption(group_id, plugin_name) : undefined;

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
