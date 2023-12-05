import { Order } from '@/plugin/order.js';
import { PluginError, Metadata, pluginList, EventName, EventState, Fiber } from '@/plugin/index.js';

export interface HookModule {
  default: () => void;
  metadata: Metadata;
}

let plugin: Fiber | null = null;
let workInProgressHook: EventState | null = null;

export function useEvent<T extends EventName[] = any>(action: EventState<T>['action'], events: T) {
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

export function useCommand<T = any>(statement: string, callback: Order['action']) {
  if (!plugin) {
    throw new PluginError('useCommand must be called inside a plugin.');
  }
  const order = new Order<T>(statement, callback);
  useEvent(<EventState['action']>order.action.bind(order), ['at.message.create', 'group.at.message.create']);
}

export async function generateHookFiber(module: HookModule): Promise<Fiber> {
  const { default: Effect, metadata } = module;
  const { name, description = null } = metadata;
  const is_use = pluginList.has(name);

  if (is_use) {
    throw new Error(`Plugin "${name}" is already registered.`);
  }
  const fiber: Fiber = {
    name,
    description,
    memoizedState: null,
  };

  plugin = fiber;
  workInProgressHook = plugin.memoizedState;

  Effect();
  plugin = null;
  workInProgressHook = null;

  return fiber;
}
