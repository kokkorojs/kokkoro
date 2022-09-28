import { deepClone } from '@kokkoro/utils';
import { MessageElem } from 'oicq';

import { Plugin } from '.';
import { UserLevel } from '../bot';
import { BotEventMap, PortEventMap } from '../events';

type CommandArg = {
  required: boolean;
  value: string;
  variadic: boolean;
};

export type CommandEventMap = {
  'all': BotEventMap['message'];
  'group': BotEventMap['message.group'];
  'private': BotEventMap['message.private'];
};

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

export class Command<T extends keyof CommandEventMap = any> {
  private regex?: RegExp;
  private min_level: UserLevel;
  private max_level: UserLevel;

  public name: string;
  public desc: string;
  public args: CommandArg[];
  public stop: (event: CommandEventMap[T]) => any;
  public func?: (event: CommandEventMap[T]) => any;

  constructor(
    public message_type: T | 'all' = 'all',
    public raw_name: string,
    public plugin: Plugin,
  ) {
    this.name = removeBrackets(raw_name);
    this.args = findAllBrackets(raw_name);
    this.desc = '';
    this.min_level = 0;
    this.max_level = 6;
    this.stop = event => {
      event.reply(`插件 ${plugin.name} 在当前群聊已被禁用`);
    }
  }

  run(event: any) {
    event.reply = (message: string | MessageElem[]) => {
      const { message_type, user_id, group_id, self_id } = event;

      // this.reply({
      //   type: message_type,
      //   message, self_id, user_id, group_id,
      // });
    };

    if (this.isLimit(event.permission_level)) {
      event.reply(`越权，当前指令 level 范围：${this.min_level} ~ ${this.max_level}，你的 level 为：${event.permission_level}`);
    } else if (this.func && this.plugin.prefix === '') {
      this.func(event);
    } else if (event.message_type !== 'private' && !event.option.apply) {
      this.stop(event);
    } else if (event.message_type !== 'private' && this.func && event.option.apply) {
      this.func(event);
    } else if (event.message_type === 'private' && this.func) {
      this.func(event);
    }
  }

  description(desc: string): Command<T> {
    this.desc = desc;
    return this;
  }

  sugar(regex: RegExp): Command<T> {
    this.regex = regex;
    return this;
  }

  action(callback: (event: CommandEventMap[T]) => any): Command<T> {
    this.func = callback;
    return this;
  }

  prevent(callback: (event: CommandEventMap[T]) => any): Command<T> {
    this.stop = callback;
    return this;
  }

  // reply(event: PortEventMap['message.send']): void {
  //   this.plugin.sendMessage(event);
  // }

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

  isMatched(event: any) {
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
