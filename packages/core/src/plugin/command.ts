import { Bot } from '@/bot.js';
import { EventType } from '@/index.js';

export type CommandEvent<T = any> = EventType<['at.message.create', 'group.at.message.create']> & {
  query: T;
};
export type CommandAction = (event: CommandEvent, bot: Bot) => string | void | Promise<string | void>;
/** 指令参数 */
export type CommandArg = {
  /** 是否必填 */
  required: boolean;
  /** 参数值 */
  value: string;
  /** 可变参数 */
  variadic: boolean;
};

export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandError';
  }
}

/**
 * 解析指令
 *
 * @param statement - 指令语句
 * @returns 指令前缀
 */
function parseCommand(statement: string): string {
  return statement.replace(/[<[].+/, '').trim();
}

/**
 * 解析指令参数
 *
 * @param statement - 指令语句
 * @returns 参数数组
 */
function parseCommandArguments(statement: string): CommandArg[] {
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
  while ((match = BRACKET_RE_GLOBAL.exec(statement))) {
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

export function useCommandAction(statement: string, callback: CommandAction) {
  const command = parseCommand(statement);
  const args = parseCommandArguments(statement);
  const isMatch = (event: CommandEvent): boolean => {
    const { content } = event;
    const message = content.replace(/^.+(?=\/)/, '').trimEnd();

    if (!message.startsWith(command)) {
      return false;
    }
    const raw_args = message
      .replace(command, '')
      .replace(/\s{2,}/, ' ')
      .split(' ')
      .filter(arg => arg);
    const args_count = args.filter(arg => arg.required).length;

    if (raw_args.length < args_count) {
      const message = `缺少指令参数，有效语句为："${statement}"`;

      event.reply({ msg_type: 0, content: message }).catch(() => {});
      return false;
    }
    const query: CommandEvent['query'] = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const { variadic, value } = arg;

      query[value] = variadic ? raw_args.slice(i) : raw_args[i] ?? null;
    }
    event.query = query;

    return true;
  };

  return async function (this: unknown, event: CommandEvent, bot: Bot) {
    const is_match = isMatch(event);

    if (!is_match) {
      return;
    }
    return await callback.call(this, event, bot);
  };
}