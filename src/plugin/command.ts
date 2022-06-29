import { deepClone } from '@kokkoro/utils';
import { MessageElem } from 'oicq';

import { Plugin } from '.';
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
  // private min_level: UserLevel;
  // private max_level: UserLevel;

  public name: string;
  public desc: string;
  public args: CommandArg[];
  public func?: (event: CommandEventMap[T]) => any;
  public stop?: (...args: any[]) => any;

  constructor(
    public message_type: T | 'all' = 'all',
    public raw_name: string,
    public plugin: Plugin,
  ) {
    this.name = removeBrackets(raw_name);
    this.args = findAllBrackets(raw_name);
    this.desc = '';
    // this.min_level = 0;
    // this.max_level = 6;
  }

  run(event: any) {
    event.reply = (message: string | MessageElem[]) => {
      const { message_type, user_id, group_id, self_id } = event;

      this.reply({
        type: message_type,
        message, self_id, user_id, group_id,
      });
    };

    if (this.func) {
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

  reply(event: PortEventMap['message.send']): void {
    this.plugin.sendMessage(event);
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
