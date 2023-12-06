import { CommandAction, useCommandAction } from '@/plugin/command.js';
import { EventName, EventState, Fiber, Metadata, pluginList } from '@/plugin/index.js';

export type PluginMetadata = {
  name?: string;
  description?: string | null;
  memoizedState?: EventState | null;
  workInProgressHook?: EventState | null;
};

interface PluginDecoratorContext extends ClassDecoratorContext {
  readonly metadata: PluginMetadata;
}

export function Plugin(metadata: Metadata) {
  return (_: any, context: PluginDecoratorContext) => {
    if (context.metadata.name) {
      throw new Error('Plugin metadata is already set.');
    }
    context.metadata.memoizedState ??= null;
    context.metadata.workInProgressHook ??= null;
    context.metadata.name = metadata.name;
    context.metadata.description = metadata.description ?? null;
  };
}

interface PluginMethodDecoratorContext extends ClassMethodDecoratorContext {
  readonly metadata: PluginMetadata;
}

export interface DecoratorPlugin {
  name: string;
  description: string | null;
  memoizedState: EventState | null;
}

function useState<T extends EventName>(
  name: T,
  target: EventState<[T]>['action'],
  context: PluginMethodDecoratorContext,
) {
  const metadata = context.metadata;

  context.metadata.memoizedState ??= null;
  context.metadata.workInProgressHook ??= null;

  if (metadata.workInProgressHook?.action === target) {
    metadata.workInProgressHook.events.push(name);
    return;
  }
  const state: EventState = {
    action: <EventState['action']>target,
    events: [name],
    next: null,
  };

  if (!metadata.memoizedState) {
    metadata.memoizedState = state;
  } else {
    metadata.workInProgressHook!.next = state;
  }
  metadata.workInProgressHook = state;
}

export function Event<T extends EventName>(name: T) {
  return function (target: EventState<[T]>['action'], context: PluginMethodDecoratorContext) {
    useState(name, target, context);
  };
}

export function Command(statement: string) {
  return (callback: CommandAction, context: PluginMethodDecoratorContext) => {
    const action = <EventState['action']>useCommandAction(statement, callback);

    useState('at.message.create', action, context);
    useState('group.at.message.create', action, context);
  };
}

export interface DecoratorModule {
  default: (new () => unknown) & {
    [Symbol.metadata]: Required<PluginMetadata>;
  };
}

export async function generateDecoratorFiber(module: DecoratorModule): Promise<Fiber> {
  const { default: Effect } = module;
  const { name, description, memoizedState } = Effect[Symbol.metadata];
  const is_use = pluginList.has(name);

  if (is_use) {
    throw new Error(`Plugin "${name}" is already registered.`);
  }
  const effect = new Effect();
  const fiber: Fiber = {
    name,
    description,
    effect,
    memoizedState,
  };

  return fiber;
}
