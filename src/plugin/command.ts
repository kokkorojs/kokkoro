import { MessageElem } from 'oicq';
import minimist from 'minimist';

import { Plugin } from '@/plugin';
import { UserLevel } from '@/core';
import { AllMessage, Context } from '@/events';

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
type CommandType = keyof CommandMap;

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
    public message_type = 'all',
  ) {
    this.name = removeBrackets(raw_name);
    this.args = findAllBrackets(raw_name);
    this.desc = '';
    this.min_level = 0;
    this.max_level = 6;
    this.stop = event => {
      // event.reply(`插件 ${plugin.name} 在当前群聊已被禁用`);
    }
  }

  run(context: Context<'message'>) {
    context.reply = (message: string | MessageElem[]) => {
      const { message_type, user_id, group_id, self_id } = context;

      this.reply({
        message_type,
        message, self_id, user_id, group_id,
      });
    }
    if (!this.func) {
      return;
    } else if (this.isLimit(context.permission_level)) {
      context.reply(`越权，该指令 level 范围：${this.min_level} ~ ${this.max_level}，你当前的 level 为：${context.permission_level}`);
    } else if (this.plugin._name === 'kokkoro') {
      this.func(context);
    } else if (context.message_type === 'group' && !context.option.apply) {
      this.stop(context);
    } else if (context.message_type === 'group' && context.option.apply) {
      this.func(context);
    } else if (context.message_type === 'private') {
      this.func(context);
    }
  }

  description(desc: string): Command<K> {
    this.desc = desc;
    return this;
  }

  sugar(regex: RegExp): Command<K> {
    this.regex = regex;
    return this;
  }

  action(callback: (event: CommandMap[K]) => any): Command<K> {
    this.func = callback;
    return this;
  }

  prevent(callback: (event: CommandMap[K]) => any): Command<K> {
    this.stop = callback;
    return this;
  }

  reply(event: any): void {
    const { self_id, message_type, user_id, group_id, message } = event;

    switch (message_type) {
      case 'private':
        this.plugin.botApi(self_id, 'sendPrivateMsg', user_id, message);
        break;
      case 'group':
        this.plugin.botApi(self_id, 'sendGroupMsg', group_id, message);
        break;
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
    const query = minimist(raw_message.split(' '));
    // const raw_name = raw_message.trim().split(' ');
    // const prefix = this.plugin.prefix !== '' ? argv._[0] : '';

    // 空字段指令匹配
    if (this.plugin.prefix === '') {
      query._.unshift('');
    }

    let [prefix, command_name] = query._;

    // 语法糖解析
    // if (this.regex && this.regex.test(raw_message)) {
    //   command_name = this.name;
    //   prefix = this.plugin.prefix;
    // }
    context.query = query;

    return this.plugin.prefix === prefix && this.name === command_name;
  }

  parseQuery(raw_message: string): { [key: string]: string; } {
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
