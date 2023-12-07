import { ClientEvent } from 'amesu';
import { pathToFileURL } from 'node:url';
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

export async function mountPlugin(path: string) {
  let plugin: Fiber;

  try {
    const parent = pathToFileURL('index.js');
    const url = import.meta.resolve(path, parent);
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
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    logger.error(`Failed to mount plugin, ${message}`);
  }
}

export * from '@/plugin/command.js';
export * from '@/plugin/hooks.js';
export * from '@/plugin/decorators.js';
