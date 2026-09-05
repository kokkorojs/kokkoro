import { type ClientEvent } from 'chobits';

import { type Context, type MountScope, assertActiveMountScope, collectCommand } from './plugin';

/** Command 声明中的参数支持使用半角空格、制表符和全角空格分隔。 */
type Whitespace = ' ' | '\t' | '\u3000';

type Tokenize<
  Source extends string,
  Token extends string = '',
  Tokens extends string[] = [],
> = Source extends `${infer Character}${infer Rest}`
  ? Character extends Whitespace
    ? Tokenize<Rest, '', Token extends '' ? Tokens : [...Tokens, Token]>
    : Tokenize<Rest, `${Token}${Character}`, Tokens>
  : Token extends ''
    ? Tokens
    : [...Tokens, Token];

type IsInvalidParameterName<Name extends string> = Name extends ''
  ? true
  : Name extends `${string}${'.' | '<' | '>' | '[' | ']'}${string}`
    ? true
    : false;

type AddParameter<Args extends object, Names extends string, Name extends string, Value> =
  IsInvalidParameterName<Name> extends true
    ? never
    : Name extends Names
      ? never
      : Args & { readonly [Key in Name]: Value };

/** 解析参数声明，同时校验参数名是否重复、排列顺序是否正确以及剩余参数是否位于末尾。 */
type ParseParameters<
  Tokens extends string[],
  Args extends object = Record<never, never>,
  Names extends string = never,
  HasOptional extends boolean = false,
> = Tokens extends [infer Token extends string, ...infer Rest extends string[]]
  ? Token extends `<${infer Name}>...`
    ? HasOptional extends true
      ? never
      : Rest extends []
        ? AddParameter<Args, Names, Name, string[]>
        : never
    : Token extends `[${infer Name}]...`
      ? Rest extends []
        ? AddParameter<Args, Names, Name, string[]>
        : never
      : Token extends `<${infer Name}>`
        ? HasOptional extends true
          ? never
          : AddParameter<Args, Names, Name, string> extends infer Next extends object
            ? ParseParameters<Rest, Next, Names | Name, false>
            : never
        : Token extends `[${infer Name}]`
          ? AddParameter<Args, Names, Name, string | undefined> extends infer Next extends object
            ? ParseParameters<Rest, Next, Names | Name, true>
            : never
          : never
  : Args;

type Simplify<Args> = Args extends object ? { readonly [Key in keyof Args]: Args[Key] } : never;

/** 根据 Command 声明推导参数类型。 */
export type ParseCommand<Syntax extends string> = Syntax extends `/${string}`
  ? Tokenize<Syntax> extends [infer Prefix extends string, ...infer Parameters extends string[]]
    ? Prefix extends `/${infer Name}`
      ? Name extends ''
        ? never
        : Simplify<ParseParameters<Parameters>>
      : never
    : never
  : never;

type CheckedSyntax<Syntax extends string> = ParseCommand<Syntax> extends never ? never : Syntax;

export const COMMAND_EVENT_TYPES = ['C2C_MESSAGE_CREATE', 'GROUP_AT_MESSAGE_CREATE', 'GROUP_MESSAGE_CREATE'] as const;

export type CommandEventType = (typeof COMMAND_EVENT_TYPES)[number];

/** Command 处理函数的触发方式。 */
export type CommandTrigger = 'command' | 'shortcut';

/** 传给 Command 处理函数的上下文。 */
export type CommandContext<Args extends object> = Context<CommandEventType> & {
  /** 由 Command 参数或 Shortcut 命名捕获组生成的参数。 */
  readonly args: Args;
  /** 本次处理由斜杠 Command 或 Shortcut 触发。 */
  readonly trigger: CommandTrigger;
};

/** Command 处理函数。抛出 `Error` 时，其消息会回复给消息来源，错误会继续向上传播。 */
export type CommandHandler<Args extends object> = (context: CommandContext<Args>) => unknown;

/** `useCommand()` 返回的链式配置接口。 */
export interface Command {
  /** 为当前 Command 添加自然语言 Shortcut。 */
  shortcut(pattern: string | RegExp): this;
}

interface Parameter {
  readonly name: string;
  readonly required: boolean;
  readonly variadic: boolean;
}

export interface CommandRegistration {
  readonly syntax: string;
  readonly prefix: string;
  readonly parameters: readonly Parameter[];
  readonly handler: CommandHandler<Record<string, string | string[] | undefined>>;
  readonly shortcuts: RegExp[];
}

export interface MountedCommand {
  readonly command: CommandRegistration;
  readonly scope: MountScope;
}

export interface CommandTask {
  readonly scope: MountScope | null;
  readonly promise: Promise<void>;
}

const parseSyntax = (syntax: string): Pick<CommandRegistration, 'parameters' | 'prefix'> => {
  if (!syntax.startsWith('/')) {
    throw new SyntaxError('Command syntax must start with /');
  }
  const tokens = syntax.trimEnd().split(/\s+/u);
  const prefix = tokens.shift();

  if (!prefix || prefix === '/') {
    throw new SyntaxError('Command prefix is invalid');
  }
  const names = new Set<string>();
  const parameters: Parameter[] = [];
  let hasOptional = false;

  for (const [index, token] of tokens.entries()) {
    const [, opening, name, closing, ellipsis] = /^([<[])([^<>[\]\s.]+)([>\]])(\.\.\.)?$/u.exec(token) ?? [];

    if (!opening || !name || (opening === '<' ? closing !== '>' : closing !== ']')) {
      throw new SyntaxError(`Invalid Command parameter: ${token}`);
    }
    const required = opening === '<';
    const variadic = ellipsis !== undefined;

    if (names.has(name)) {
      throw new SyntaxError(`Duplicate Command parameter: ${name}`);
    }

    if (required && hasOptional) {
      throw new SyntaxError('Required Command parameters must precede optional parameters');
    }

    if (variadic && index !== tokens.length - 1) {
      throw new SyntaxError('A variadic Command parameter must be last');
    }
    names.add(name);
    parameters.push({ name, required, variadic });

    hasOptional ||= !required;
  }
  return { parameters, prefix };
};

const createDefaultArgs = (parameters: readonly Parameter[]): Record<string, string | string[] | undefined> =>
  Object.fromEntries(parameters.map(parameter => [parameter.name, parameter.variadic ? [] : undefined]));

const parseArgs = (
  parameters: readonly Parameter[],
  values: readonly string[],
): Record<string, string | string[] | undefined> | null => {
  const args = createDefaultArgs(parameters);
  let index = 0;

  for (const parameter of parameters) {
    if (parameter.variadic) {
      const rest = values.slice(index);

      if (parameter.required && rest.length === 0) {
        return null;
      }
      args[parameter.name] = rest;
      return args;
    }
    const value = values[index];

    if (value === undefined) {
      if (parameter.required) {
        return null;
      }
      continue;
    }
    args[parameter.name] = value;
    index++;
  }

  return args;
};

const matchShortcut = (
  command: CommandRegistration,
  pattern: RegExp,
  content: string,
): Record<string, string | string[] | undefined> | null => {
  pattern.lastIndex = 0;
  const match = pattern.exec(content);

  if (!match) {
    return null;
  }
  const groups = match.groups ?? {};
  const args = createDefaultArgs(command.parameters);

  for (const parameter of command.parameters) {
    const value = groups[parameter.name];

    if (parameter.required && !value) {
      return null;
    }
    args[parameter.name] = parameter.variadic ? (value === undefined ? [] : [value]) : value;
  }
  return args;
};

const getCaptureNames = (pattern: RegExp): Set<string> => {
  // 空分支让 exec() 返回匹配结果，groups 会包含正则中声明的全部命名捕获组。
  const match = new RegExp(`(?:${pattern.source})|`, pattern.flags).exec('');

  return new Set(Object.keys(match?.groups ?? {}));
};

const validateShortcut = (command: CommandRegistration, pattern: RegExp): void => {
  const requiredNames = command.parameters.filter(parameter => parameter.required).map(parameter => parameter.name);

  if (requiredNames.length === 0) {
    return;
  }
  const captureNames = getCaptureNames(pattern);
  const missingNames = requiredNames.filter(name => !captureNames.has(name));

  if (missingNames.length > 0) {
    throw new SyntaxError(`Command shortcut is missing required parameters: ${missingNames.join(', ')}`);
  }
};

const reply = async (event: ClientEvent<CommandEventType>, message: string): Promise<void> => {
  await event.reply(message);
};

const runCommand = async (
  command: CommandRegistration,
  event: ClientEvent<CommandEventType>,
  args: Record<string, string | string[] | undefined>,
  trigger: CommandTrigger,
): Promise<void> => {
  // Chobits 的事件对象是只读的，展开后的上下文也保持只读。
  const context = Object.freeze({ ...event, args, trigger });
  let result: unknown;

  try {
    result = await command.handler(context);
  } catch (error) {
    if (error instanceof Error) {
      try {
        await reply(event, error.message);
      } catch (replyError) {
        throw new SuppressedError(replyError, error, 'Command failed and error reply failed');
      }
      throw error;
    }
    throw new TypeError('Command handler must throw an Error', { cause: error });
  }

  if (result !== undefined) {
    const message = typeof result === 'object' ? (JSON.stringify(result) ?? String(result)) : String(result);

    await reply(event, message);
  }
};

const normalizeContent = (event: ClientEvent<CommandEventType>): string => {
  const content = event.content.trimStart();

  if ('mentions' in event) {
    const mention = event.mentions?.find(({ is_you }) => is_you);

    if (mention) {
      const prefix = `<@${mention.id}>`;

      if (content.startsWith(prefix)) {
        return content.slice(prefix.length).trimStart();
      }
    }
  }
  return content;
};

/**
 * 为当前消息创建所有匹配的 Command 任务。
 *
 * 处理函数延后到微任务中执行，让调用方先把任务加入 `scope.pending`。
 */
export const createCommandTasks = (
  commands: readonly MountedCommand[],
  event: ClientEvent<CommandEventType>,
): CommandTask[] => {
  const content = normalizeContent(event);

  if (content.startsWith('/')) {
    const [prefix, ...values] = content.trimEnd().split(/\s+/u);
    const mounted = commands.find(({ command }) => command.prefix === prefix);

    if (!mounted) {
      if (commands.length === 0) {
        return [];
      }
      return [
        {
          scope: null,
          promise: Promise.resolve().then(() => reply(event, commands.map(({ command }) => command.syntax).join('\n'))),
        },
      ];
    }
    const args = parseArgs(mounted.command.parameters, values);

    return [
      {
        scope: mounted.scope,
        promise: Promise.resolve().then(() =>
          args === null
            ? reply(event, `缺少指令参数，有效语句为："${mounted.command.syntax}"`)
            : runCommand(mounted.command, event, args, 'command'),
        ),
      },
    ];
  }

  return commands.flatMap(mounted =>
    mounted.command.shortcuts.flatMap(pattern => {
      const args = matchShortcut(mounted.command, pattern, content);

      return args === null
        ? []
        : [
            {
              scope: mounted.scope,
              promise: Promise.resolve().then(() => runCommand(mounted.command, event, args, 'shortcut')),
            },
          ];
    }),
  );
};

/**
 * 注册斜杠 Command。
 *
 * 参数声明使用 `<name>`、`[name]`、`<name>...` 和 `[name]...`。
 *
 * @see {@link https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html POSIX Utility Syntax Guidelines}
 * @see {@link https://man7.org/linux/man-pages/man7/man-pages.7.html man-pages synopsis conventions}
 * @see {@link https://github.com/tj/commander.js#command-arguments Commander command arguments}
 * @see {@link https://docs.rs/clap/latest/clap/_derive/_tutorial/index.html clap derive tutorial}
 */
export function useCommand<const Syntax extends `/${string}`>(
  syntax: CheckedSyntax<Syntax>,
  handler: CommandHandler<ParseCommand<Syntax>>,
): Command {
  if (typeof syntax !== 'string') {
    throw new TypeError('Command syntax must be a string');
  }

  if (typeof handler !== 'function') {
    throw new TypeError('Command handler must be a function');
  }
  const parsed = parseSyntax(syntax);
  const registration: CommandRegistration = {
    syntax,
    ...parsed,
    // 处理函数的泛型已经约束 Args，注册表只需保留统一的运行时结构。
    handler: <CommandRegistration['handler']>(<unknown>handler),
    shortcuts: [],
  };
  const scope = collectCommand(registration);
  const command: Command = {
    shortcut(pattern) {
      assertActiveMountScope(scope);

      if (typeof pattern !== 'string' && !(pattern instanceof RegExp)) {
        throw new TypeError('Command shortcut must be a string or RegExp');
      }
      const regex =
        typeof pattern === 'string' ? new RegExp(String.raw`^\s*${RegExp.escape(pattern)}\s*$`, 'u') : pattern;

      validateShortcut(registration, regex);
      registration.shortcuts.push(regex);

      return this;
    },
  };
  return command;
}
