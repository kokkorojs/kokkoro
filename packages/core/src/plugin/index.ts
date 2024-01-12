import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { ClientEvent, objectToString } from 'amesu';
import { Bot } from '@/bot.js';
import { logger } from '@/logger.js';
import { HookModule, generateHookFiber } from '@/plugin/hooks.js';
import { DecoratorModule, generateDecoratorFiber } from '@/plugin/decorators.js';

/** 事件名 */
export type EventName = keyof ClientEvent;
/** 事件类型 */
export type EventType<Name extends EventName> = {
  [Key in Name]: ClientEvent[Key] extends (event: infer Event) => void ? Event : never;
}[Name];
/** 上下文 */
export type Context<Name extends EventName = EventName> = EventType<Name> & {
  bot: Bot;
  api: Bot['api'];
  request: Bot['request'];
  logger: Bot['logger'];
};

/** 元数据 */
export interface Metadata {
  /** 名称 */
  name: string;
  /** 描述 */
  description?: string;
}

export interface EventState<Name extends EventName = any> {
  action: (ctx: Context<Name>) => unknown | Promise<unknown>;
  events: Name;
  next: EventState<Name> | null;
}

export class PluginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginError';
  }
}

export interface Fiber {
  name: string;
  description: string | null;
  effect: unknown;
  memoizedState: EventState | null;
}

export const pluginList = new Map<string, Fiber>();

async function resolveModule(path: string): Promise<string> {
  const is_file = path.endsWith('.js');

  if (is_file) {
    const working = process.cwd();
    const absolute = join(working, path);
    const { href } = pathToFileURL(absolute);

    return href;
  }
  // TODO: ／人◕ ‿‿ ◕人＼ 目录递归
  const module = join('node_modules', path);
  const pkg = join(module, 'package.json');
  const has_pkg = existsSync(pkg);

  let main = 'index.js';

  if (has_pkg) {
    const text = await readFile(pkg, 'utf-8');
    const json = JSON.parse(text);

    main = json.main ?? json.exports ?? main;
  }
  const relative = join(module, main);
  const { href } = pathToFileURL(relative);

  return href;
}

export async function mountPlugin(path: string) {
  let plugin: Fiber;

  try {
    const url = await resolveModule(path);
    const module = <HookModule | DecoratorModule>await import(url);

    if (typeof module.default !== 'function') {
      throw new PluginError('Plugin must be a class or a function');
    } else {
      const is_class = module.default.toString().startsWith('class');

      plugin = is_class
        ? await generateDecoratorFiber(<DecoratorModule>module)
        : await generateHookFiber(<HookModule>module);
    }
    logger.info(`Mount plugin: "${plugin.name}"`);
    pluginList.set(plugin.name, plugin);
  } catch (error) {
    const message = error instanceof Error ? error.message : objectToString(error);
    logger.error(`Failed to mount plugin, ${message}`);
  }
}

export * from '@/plugin/command.js';
export * from '@/plugin/hooks.js';
export * from '@/plugin/decorators.js';
