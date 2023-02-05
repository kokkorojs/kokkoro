import { Plugin } from '@/plugin';
import { Context } from '@/events';
import { PermissionLevel } from '@/core';

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
  private stop: (ctx: CommandMap[K]) => void;
  private func?: (ctx: CommandMap[K]) => void;

  public desc: string;
  public name: string;
  public args: CommandArg[];

  constructor(
    /** 插件实例 */
    private plugin: Plugin,
    /** 命令 */
    public raw_name: string,
    /** 消息类型 */
    private message_type: CommandType = 'all',
  ) {
    this.desc = '';
    this.min_level = 0;
    this.max_level = 6;
    this.name = removeBrackets(raw_name);
    this.args = findAllBrackets(raw_name);

    this.stop = (ctx) => {
      const plugin_name = plugin.getName();
      ctx.reply(`插件 ${plugin_name} 在当前群聊已被禁用`);
    }
  }

  /**
   * 简介
   * 
   * @param desc - 指令简单描述
   */
  public description(desc: string): Command<K> {
    this.desc = desc;
    return this;
  }

  /**
   * 语法糖
   * 
   * @param shortcut - 与之匹配的字符串或正则
   */
  public sugar(shortcut: string | RegExp): Command<K> {
    if (shortcut instanceof RegExp) {
      this.regex = shortcut;
    } else {
      // 字符串转换正则并自动添加 ^ $
      const regex = new RegExp(`^${shortcut}$`);
      this.regex = regex;
    }
    return this;
  }

  /**
   * 指令执行
   * 
   * @param callback 触发回调
   */
  public action(callback: (ctx: CommandMap[K]) => any): this {
    this.func = async (ctx: CommandMap[K]) => {
      try {
        await callback(ctx);
      } catch (error) {
        ctx
          .reply((<Error>error).toString())
          .catch((error) => {
            this.plugin.logger.error(error);
          })
      }
    };
    return this;
  }

  /**
   * 指令被拒
   *
   * @param callback 触发回调
   */
  public prevent(callback: (ctx: CommandMap[K]) => any): this {
    this.stop = async (ctx: CommandMap[K]) => {
      try {
        await callback(ctx);
      } catch (error) {
        ctx
          .reply((<Error>error).toString())
          .catch((error) => {
            this.plugin.logger.error(error);
          })
      }
    };
    return this;
  }

  /**
   * 指令权限
   *
   * @param min_level - 最低权限
   * @param max_level - 最高权限
   */
  public limit(min_level: PermissionLevel, max_level: PermissionLevel = 6) {
    if (min_level > max_level) {
      throw new Error('min level be greater than max level');
    }
    this.min_level = min_level;
    this.max_level = max_level;

    return this;
  }

  public isMatched(ctx: Context<'message'>) {
    const { raw_message, message_type } = ctx;

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
    let match = this.plugin.prefix === prefix && this.name === command_name;
    const query = match ? this.parseQuery(raw_message) : {};
    const args_count = this.args.filter((arg) => arg.required).length;
    const query_count = Object.entries(query).filter((arg) => arg[1]).length;

    if (match && query_count < args_count) {
      match = false;
      ctx
        .reply(`缺少命令 "${this.raw_name}" 所需的参数`)
        .catch((error: Error) => this.plugin.logger.error(error))
    }
    ctx.query = query;

    return match;
  }

  // public handle(ctx: CommandMap[K]) {
  public handle(ctx: CommandMap[K]) {
    if (!this.func) {
      return;
    }
    const { setting, permission_level, message_type } = ctx;
    const name = this.plugin.getName();
    const option = setting?.[name];

    ctx.option = option ?? null;

    if (this.isLimit(permission_level)) {
      const scope = this.min_level !== this.max_level
        ? `范围：${this.min_level} ~ ${this.max_level}`
        : `要求：${this.max_level}`;

      ctx.reply(`越权，指令 ${this.name} 的 level ${scope}，你当前的 level 为：${permission_level}`, true);
    } else if (name === 'kokkoro') {
      this.func(ctx);
    } else if (message_type === 'group' && !option!.apply) {
      this.stop(ctx);
    } else if (message_type === 'group' && option!.apply) {
      this.func(ctx);
    } else if (message_type === 'private') {
      this.func(ctx);
    }
  }

  private isLimit(level: PermissionLevel): boolean {
    return level < this.min_level || level > this.max_level;
  }

  private parseQuery(raw_message: string): object {
    const query: { [k: string]: any } = {};

    if (this.regex && this.regex.test(raw_message)) {
      const { groups = {} } = this.regex.exec(raw_message)!;

      this.args.forEach((arg) => {
        const { variadic, value } = arg;

        if (variadic) {
          query[value] = groups[value] ? groups[value].split(' ') : null;
        } else {
          query[value] = groups[value] ?? null;
        }
      });
    } else {
      const args = raw_message
        .replace(new RegExp(this.plugin.prefix), '')
        .replace(new RegExp(this.name), '')
        .split(' ')
        .filter(i => i !== '')

      this.args.forEach((arg, index) => {
        const { variadic, value } = arg;

        if (variadic) {
          const arg = args.slice(index);
          query[value] = arg.length ? arg : null;
        } else {
          query[value] = args[index] ?? null;
        }
      });
    }
    return query;
  }
}
