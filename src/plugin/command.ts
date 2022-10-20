import { MessageElem } from 'oicq';

import { Plugin } from '@/plugin';
import { Context } from '@/events';
import { UserLevel } from '@/core';

/** 指令参数 */
type CommandArg = {
  /** 是否必填 */
  required: boolean;
  /** 指令值 */
  value: string;
  /** 可选参数 */
  variadic: boolean;
}

export type CommandMap = {
  'all': Context<'message'>;
  'group': Context<'message.group'>;
  'private': Context<'message.private'>;
}
export type CommandType = keyof CommandMap;

function removeBrackets(name: string): string {
  return name.replace(/[<[].+/, '').trim();
}

function findAllBrackets(name: string) {
  const res = [];
  const ANGLED_BRACKET_RE_GLOBAL = /<([^>]+)>/g;
  const SQUARE_BRACKET_RE_GLOBAL = /\[([^\]]+)\]/g;

  const parse = (match: string[]) => {
    let variadic = false;
    let value = match[1];

    if (value.startsWith('...')) {
      value = value.slice(3);
      variadic = true;
    }
    return {
      required: match[0].startsWith('<'),
      value,
      variadic,
    };
  };

  let angledMatch;
  while ((angledMatch = ANGLED_BRACKET_RE_GLOBAL.exec(name))) {
    res.push(parse(angledMatch));
  }

  let squareMatch;
  while ((squareMatch = SQUARE_BRACKET_RE_GLOBAL.exec(name))) {
    res.push(parse(squareMatch));
  }

  return res;
}

export class Command<K extends CommandType = any> {
  private regex?: RegExp;
  private min_level: UserLevel;
  private max_level: UserLevel;

  public name: string;
  public desc: string;
  public args: CommandArg[];
  public stop: (ctx: CommandMap[K]) => void;
  public func?: (ctx: CommandMap[K]) => void;

  constructor(
    /** 插件实例 */
    public plugin: Plugin,
    /** 命令 */
    public raw_name: string,
    /** 消息类型 */
    public message_type: CommandType = 'all',
  ) {
    this.name = removeBrackets(raw_name);
    this.args = findAllBrackets(raw_name);
    this.desc = '';
    this.min_level = 0;
    this.max_level = 6;
    this.stop = ctx => {
      ctx.reply(`插件 ${plugin.name} 在当前群聊已被禁用`);
    }
  }

  run(context: CommandMap[K]) {
    if (!this.func) {
      return;
    }
    context.reply = (message: string | MessageElem[]) => {
      this.reply(context, message);
    }

    if (this.isLimit(context.permission_level)) {
      context.reply(`越权，该指令 level 范围：${this.min_level} ~ ${this.max_level}，你当前的 level 为：${context.permission_level}`);
    } else if (this.plugin._name === 'kokkoro') {
      this.func(context);
    } else if (context.message_type === 'group' && !context.setting.apply) {
      this.stop(context);
    } else if (context.message_type === 'group' && context.setting.apply) {
      this.func(context);
    } else if (context.message_type === 'private') {
      this.func(context);
    }
  }

  description(desc: string): Command<K> {
    this.desc = desc;
    return this;
  }

  sugar(shortcut: string | RegExp): Command<K> {
    if (shortcut instanceof RegExp) {
      this.regex = shortcut;
    } else {
      // 字符串转换正则并自动添加 ^ $
      const regex = new RegExp(/(\^|\$)/.test(shortcut) ? shortcut : `^${shortcut}$`);
      this.regex = regex;
    }
    return this;
  }

  action(callback: (ctx: CommandMap[K]) => any): this {
    this.func = callback;
    return this;
  }

  prevent(callback: (ctx: CommandMap[K]) => any): this {
    this.stop = callback;
    return this;
  }

  reply(context: CommandMap[K], message: string | MessageElem[]): void {
    const { message_type, self_id } = context;

    if (message_type === 'private') {
      this.plugin.botApi(self_id, 'sendPrivateMsg', context.user_id, message);
    } else {
      this.plugin.botApi(self_id, 'sendGroupMsg', (<any>context).group_id, message);
    }
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
    return level < this.min_level || level > this.max_level;
  }

  isMatched(context: Context<'message'>) {
    const { raw_message, message_type } = context;

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
    const match = this.plugin.prefix === prefix && this.name === command_name;
    context.query = match ? this.parseQuery(raw_message) : {};

    return match;
  }

  parseQuery(raw_message: string): object {
    if (this.regex && this.regex.test(raw_message)) {
      const { groups } = this.regex.exec(raw_message)!;
      const query = groups ? { ...groups } : {};

      return query;
    } else {
      const query = Object.fromEntries(
        raw_message
          .replace(new RegExp(this.plugin.prefix), '')
          .replace(new RegExp(this.name), '')
          .split(' ')
          .filter(i => i !== '')
          .map((v, i) => [this.args[i].value, v])
      );

      return query;
    }
  }
}
