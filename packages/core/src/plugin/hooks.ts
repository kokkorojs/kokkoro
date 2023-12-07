import { CommandAction, Query, useCommandAction } from '@/plugin/command.js';
import { EventName, EventState, Fiber, Metadata, PluginError, pluginList } from '@/plugin/index.js';

export interface HookModule {
  default: () => void;
  metadata: Metadata;
}

let plugin: Fiber | null = null;
let workInProgressHook: EventState | null = null;

export function useEvent<Name extends EventName>(action: EventState<Name>['action'], events: Name[]) {
  if (!plugin) {
    throw new PluginError('useEvent must be called inside a plugin.');
  }
  const state: EventState = {
    action: <EventState['action']>action,
    events,
    next: null,
  };

  if (!plugin.memoizedState) {
    plugin.memoizedState = state;
  } else {
    workInProgressHook!.next = state;
  }
  workInProgressHook = state;
}

export function useCommand<T = Query>(statement: string, callback: CommandAction<T>) {
  if (!plugin) {
    throw new PluginError('useCommand must be called inside a plugin.');
  }
  const action = <EventState['action']>useCommandAction(statement, <CommandAction>callback);
  useEvent(action, ['at.message.create', 'group.at.message.create']);
}

export async function generateHookFiber(module: HookModule): Promise<Fiber> {
  const { default: effect, metadata } = module;
  const { name, description = null } = metadata;
  const is_use = pluginList.has(name);

  if (is_use) {
    throw new Error(`Plugin "${name}" is already registered.`);
  }
  const fiber: Fiber = {
    name,
    description,
    effect,
    memoizedState: null,
  };

  plugin = fiber;
  workInProgressHook = plugin.memoizedState;
  effect();
  plugin = null;
  workInProgressHook = null;

  return fiber;
}
