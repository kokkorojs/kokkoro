import { Plugin } from '.';

export type CommandMessageType = 'all' | 'group' | 'private';

interface CommandArg {
  required: boolean;
  value: string;
  variadic: boolean;
}

// export interface commandEvent {
//   'all': AllMessageEvent;
//   'group': GroupMessageEvent;
//   'private': PrivateMessageEvent;
// }

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

export class Command {
  private regex?: RegExp;
  // private min_level: UserLevel;
  // private max_level: UserLevel;

  public name: string;
  public desc: string;
  public args: CommandArg[];
  public func?: (...args: any[]) => any;
  public stop?: (...args: any[]) => any;

  constructor(
    public raw_name: string,
    public message_type: 'all' | 'private' | 'group',
    public plugin: Plugin,
  ) {
    this.name = removeBrackets(raw_name);
    this.args = findAllBrackets(raw_name);
    this.desc = '';
    // this.min_level = 0;
    // this.max_level = 6;
  }

  run(event: any) {
    event.reply = (message: any) => {
      const { message_type, user_id, group_id } = event;

      this.reply({
        name: 'message.send',
        event: {
          type: message_type,
          message, user_id, group_id,
        },
      });
    };

    if (this.func) {
      this.func(event);
    }
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

  reply(event: any) {
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
}
