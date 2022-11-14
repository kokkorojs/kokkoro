import { Sendable } from 'amesu';

import { Context } from '@/events';
import { Bot, PermissionLevel } from '@/core';
import { BotApiParams, Plugin } from '@/plugin';

/** 指令参数 */
type CommandArg = {
  /** 是否必填 */
  required: boolean;
  /** 指令值 */
  value: string;
  /** 可选参数 */
  variadic: boolean;
}

type CommandMap = {
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
  private min_level: PermissionLevel;
  private max_level: PermissionLevel;

  public name: string;
  public desc: string;
  public args: CommandArg[];
  private stop: (ctx: CommandMap[K]) => void;
  private func?: (ctx: CommandMap[K]) => void;

  constructor(
    /** 插件实例 */
    private plugin: Plugin,
    /** 命令 */
    public raw_name: string,
    /** 消息类型 */
    private message_type: CommandType = 'all',
  ) {
    this.name = removeBrackets(raw_name);
    this.args = findAllBrackets(raw_name);
    this.desc = '';
    this.min_level = 0;
    this.max_level = 6;

    this.stop = (ctx) => {
      const plugin_name = plugin.getName();
      ctx.reply(`插件 ${plugin_name} 在当前群聊已被禁用`);
    }
  }

  run(context: CommandMap[K]) {
    if (!this.func) {
      return;
    }
    const plugin_name = this.plugin.getName();
    const option = context.setting?.[plugin_name];
    const disable = context.disable;

    if (disable.has(plugin_name)) {
      return;
    }
    context.option = option;
    context.reply = (content: Sendable) => {
      this.reply(context, content);
    }
    context.botApi = <K extends keyof Bot>(method: K, ...params: BotApiParams<Bot[K]>) => {
      return this.plugin.botApi(context.self_id, method, ...params);
    }

    if (this.isLimit(context.permission_level)) {
      const scope = this.min_level !== this.max_level
        ? `范围：${this.min_level} ~ ${this.max_level}`
        : `要求：${this.max_level}`;

      context.reply(`越权，指令 ${this.name} 的 level ${scope}，你当前的 level 为：${context.permission_level}`);
    } else if (plugin_name === 'kokkoro') {
      this.func(context);
    } else if (context.message_type === 'group' && !context.option!.apply) {
      this.stop(context);
    } else if (context.message_type === 'group' && context.option!.apply) {
      this.func(context);
    } else if (context.message_type === 'private') {
      this.func(context);
    }
  }

  description(desc: string): Command<K> {
    this.desc = desc;
    return this;
  }

  public sugar(shortcut: string | RegExp): Command<K> {
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

  reply(context: CommandMap[K], content: Sendable) {
    const { message_type, self_id } = context;

    if (message_type === 'private') {
      return this.plugin.botApi(self_id, 'sendPrivateMsg', context.user_id, content);
    } else {
      return this.plugin.botApi(self_id, 'sendGroupMsg', (<any>context).group_id, content);
    }
  }

  limit(min_level: PermissionLevel, max_level: PermissionLevel = 6) {
    if (min_level > max_level) {
      throw new Error('min level be greater than max level');
    }
    this.min_level = min_level;
    this.max_level = max_level;

    return this;
  }

  isLimit(level: PermissionLevel): boolean {
    return level < this.min_level || level > this.max_level;
  }

  public isMatched(context: Context<'message'>) {
    const { raw_message, message_type } = context;

    // 匹配事件类型
    if (this.message_type !== 'all' && this.message_type !== message_type) {
      return false;
    }
    const raw_name = raw_message.trim().split(' ');

    // 空字段指令匹配
    if (!this.plugin.prefix) {
      raw_name.unshift(this.plugin.prefix);
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

  private parseQuery(raw_message: string): object {
    // TODO ⎛⎝≥⏝⏝≤⎛⎝ 多参数 <...params> 解析
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
