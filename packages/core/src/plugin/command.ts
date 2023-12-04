import { Bot } from '@/bot.js';
import { EventType } from '@/plugin/index.js';

/** 指令参数 */
export type CommandArg = {
  /** 是否必填 */
  required: boolean;
  /** 参数值 */
  value: string;
  /** 可变参数 */
  variadic: boolean;
};

export type CommandEvent<T = any> = EventType<['at.message.create', 'group.at.message.create']> & {
  query: T;
};

export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandError';
  }
}

export class Command<T = any> {
  public prefix: string;
  public args: CommandArg[];

  constructor(
    public statement: string,
    private callback: (event: CommandEvent, bot: Bot) => string | void | Promise<string | void>,
  ) {
    this.prefix = this.parsePrefix();
    this.args = this.parseArguments();
  }

  public action(event: CommandEvent<T>, bot: Bot): ReturnType<Command['callback']> {
    const is_match = this.isMatch(event);

    if (!is_match) {
      return;
    }
    return this.callback(event, bot);
  }

  private parsePrefix(): string {
    return this.statement.replace(/[<[].+/, '').trim();
  }

  private parseArguments(): CommandArg[] {
    const args = [];
    const BRACKET_RE_GLOBAL = /<([^>]+)>|\[([^\]]+)\]/g;

    const parse = (match: string[]): CommandArg => {
      let variadic = false;
      let value = match[1] ?? match[2];

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

    let match;
    while ((match = BRACKET_RE_GLOBAL.exec(this.statement))) {
      args.push(parse(match));
    }

    for (let i = 0; i < args.length; i++) {
      const { variadic, value } = args[i];

      if (variadic && i !== args.length - 1) {
        throw new CommandError(`only the last argument can be variadic "...${value}"`);
      }
    }
    return args;
  }

  private isMatch(event: CommandEvent): boolean {
    const { content } = event;
    const message = content.replace(/^.+(?=\/)/, '').trimEnd();

    if (!message.startsWith(this.prefix)) {
      return false;
    }
    const args = message
      .replace(this.prefix, '')
      .replace(/\s{2,}/, ' ')
      .split(' ')
      .filter(arg => arg);
    const args_count = this.args.filter(arg => arg.required).length;

    if (args.length < args_count) {
      const message = `缺少指令参数，有效语句为："${this.statement}"`;

      event.reply({ msg_type: 0, content: message }).catch(() => {});
      return false;
    }
    const query: CommandEvent['query'] = {};

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      const { variadic, value } = arg;

      query[value] = variadic ? args.slice(i) : args[i] ?? null;
    }
    event.query = query;

    return true;
  }
}
