import { pathToFileURL } from 'url';
import { Bot } from '@/bot.js';
import { Command } from '@/plugin/command.js';
import { PluginError, Metadata, pluginList, EventName, EventType } from '@/plugin/index.js';

export interface Event<T extends EventName[] = any> {
  action: (event: EventType<T>, bot: Bot) => string | void | Promise<string | void>;
  names: T;
  next: Event<T> | null;
}

export interface Plugin {
  name: string;
  description: string | null;
  memoizedEvent: Event | null;
}

export interface PluginModule {
  default: () => void;
  metadata: Metadata;
}

let plugin: Plugin | null = null;
let workInProgressEvent: Event | null = null;

export function useEvent<T extends EventName[] = any>(action: Event<T>['action'], names: T) {
  if (!plugin) {
    throw new PluginError('useEvent must be called inside a plugin.');
  }
  const event: Event = {
    action: <Event['action']>action,
    names,
    next: null,
  };

  if (!plugin.memoizedEvent) {
    plugin.memoizedEvent = event;
  } else {
    workInProgressEvent!.next = event;
  }
  workInProgressEvent = event;
}

export function useCommand<T = any>(statement: string, callback: Command['action']) {
  if (!plugin) {
    throw new PluginError('useCommand must be called inside a plugin.');
  }
  const command = new Command<T>(statement, callback);
  useEvent(<Event['action']>command.action.bind(command), ['at.message.create', 'group.at.message.create']);
}

export async function mountPlugin(path: string): Promise<void> {
  const { href } = pathToFileURL(path);
  const { default: effect, metadata } = <PluginModule>await import(href);
  const { name, description = null } = metadata;

  plugin = {
    name,
    description,
    memoizedEvent: null,
  };
  workInProgressEvent = plugin.memoizedEvent;

  effect();
  pluginList.set(plugin.name, plugin);

  plugin = null;
  workInProgressEvent = null;
}
