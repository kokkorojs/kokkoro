import { type ClientEvent, type ClientEventType } from 'chobits';

import { type Bot } from './bot';
import { type CommandRegistration } from './command';

/** QQ Dispatch 事件。 */
export const EVENT_TYPES = [
  'READY',
  'RESUMED',
  'C2C_MESSAGE_CREATE',
  'GROUP_AT_MESSAGE_CREATE',
  'GROUP_MESSAGE_CREATE',
  'GROUP_ADD_ROBOT',
  'GROUP_DEL_ROBOT',
  'GROUP_MSG_RECEIVE',
  'GROUP_MSG_REJECT',
  'GROUP_MEMBER_ADD',
  'GROUP_MEMBER_REMOVE',
  'SUBSCRIBE_MESSAGE_STATUS',
  'GROUP_JOIN_REQUEST',
  'FRIEND_ADD',
  'FRIEND_DEL',
  'C2C_MSG_RECEIVE',
  'C2C_MSG_REJECT',
  'INTERACTION_CREATE',
] as const satisfies readonly ClientEventType[];

/** QQ Dispatch 事件类型。 */
export type EventType = (typeof EVENT_TYPES)[number];

/** 事件上下文，包含展开后的事件字段。 */
export type Context<Type extends EventType = EventType> = Type extends EventType
  ? ClientEvent<Type> extends object
    ? ClientEvent<Type>
    : Record<never, never>
  : never;

/**
 * 避免 TypeScript 把返回其他值的函数视为合法的 void 回调。
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/2/functions.html#return-type-void TypeScript void return type}
 * @see {@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/index.d.ts React VoidOrUndefinedOnly}
 */
declare const UNDEFINED_VOID_ONLY: unique symbol;

type VoidOrUndefinedOnly = void | { [UNDEFINED_VOID_ONLY]: never };

/** 释放资源的函数。 */
export type Cleanup = () => void | Promise<void>;

/** 插件日志记录器。 */
export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/** 挂载到 Bot 时同步声明 Hook，并可返回清理函数。 */
export type PluginSetup = (bot: Bot) => VoidOrUndefinedOnly | Cleanup;

/** 用于动态导入默认导出为 PluginSetup 的模块。 */
export type PluginLoader = () => Promise<{ readonly default: PluginSetup }>;

/** 当前运行时中已加载的完整插件。 */
export interface Plugin {
  /** 模块默认导出的 PluginSetup。 */
  readonly setup: PluginSetup;

  /** 执行通过 `useDispose()` 收集的模块清理函数。 */
  dispose(): Promise<void>;
}

type EventCallback = (context: Context) => void | Promise<void>;
type MountCallback = () => void | Promise<void>;

interface Effect {
  readonly callback: EventCallback | MountCallback;
  readonly dependencies: readonly EventType[] | undefined;
}

export interface MountScope {
  readonly effects: Effect[];
  readonly commands: CommandRegistration[];
  readonly pending: Set<Promise<void>>;
  disposables: AsyncDisposableStack | null;
  status: 'mounting' | 'mounted' | 'unmounting';
}

interface LoadScope {
  readonly disposables: AsyncDisposableStack;
  readonly logger: Logger;
}

interface ActiveScopes {
  load: LoadScope | null;
  mount: MountScope | null;
}

const activeScopes: ActiveScopes = {
  load: null,
  mount: null,
};

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return false;
  }
  return typeof (<{ then?: unknown }>value).then === 'function';
};

const getActiveMountScope = (): MountScope => {
  if (!activeScopes.mount) {
    throw new Error('Hooks can only be called while mounting a plugin');
  }
  return activeScopes.mount;
};

/** Hook 只在 PluginSetup 的同步调用链中收集。 */
const invokeWithMountScope = (scope: MountScope, callback: () => unknown): unknown => {
  const previous = activeScopes.mount;

  activeScopes.mount = scope;

  try {
    return callback();
  } finally {
    activeScopes.mount = previous;
  }
};

const getSetup = (module: unknown): PluginSetup => {
  if (typeof module !== 'object' || module === null || !Object.hasOwn(module, 'default')) {
    throw new TypeError('Plugin loader must resolve to a module with a default export');
  }
  const setup = (<{ readonly default: unknown }>module).default;

  if (typeof setup !== 'function') {
    throw new TypeError('Plugin module default export must be a function');
  }
  return <PluginSetup>setup;
};

const validateSetupResult = async (result: unknown): Promise<Cleanup | undefined> => {
  if (isPromiseLike(result)) {
    try {
      await result;
    } catch (cause) {
      throw new TypeError('Plugin setup must be synchronous', { cause });
    }
    throw new TypeError('Plugin setup must be synchronous');
  }

  if (result === undefined) {
    return undefined;
  }

  if (typeof result !== 'function') {
    throw new TypeError('Plugin setup must return void or a cleanup function');
  }
  return <Cleanup>result;
};

const runEffect = async (effect: Effect, context?: Context): Promise<void> => {
  const result =
    context === undefined ? await (<MountCallback>effect.callback)() : await (<EventCallback>effect.callback)(context);

  if (result !== undefined) {
    throw new TypeError('Event callback must return void or Promise<void>');
  }
};

export const createMountScope = (): MountScope => ({
  effects: [],
  commands: [],
  pending: new Set(),
  disposables: null,
  status: 'mounting',
});

export const collectCommand = (command: CommandRegistration): MountScope => {
  const scope = getActiveMountScope();

  scope.commands.push(command);
  return scope;
};

export const assertActiveMountScope = (scope: MountScope): void => {
  if (activeScopes.mount !== scope) {
    throw new Error('Command shortcuts can only be registered while mounting a plugin');
  }
};

export const render = (scope: MountScope, setup: PluginSetup, bot: Bot): Promise<Cleanup | undefined> =>
  validateSetupResult(invokeWithMountScope(scope, () => setup(bot)));

/**
 * 加载默认导出为 PluginSetup 的插件模块。
 *
 * 同一时刻只能加载一个插件，使顶层模块 Hook 始终归属当前模块。
 *
 * @param loader 动态导入插件模块的函数。
 * @param logger 提供给 `useLogger()` 的日志记录器，默认使用 `console`。
 */
export const loadPlugin = async (loader: PluginLoader, logger: Logger = console): Promise<Plugin> => {
  if (typeof loader !== 'function') {
    throw new TypeError('Plugin loader must be a function');
  }

  if (activeScopes.load) {
    throw new Error('Plugins cannot be loaded concurrently');
  }

  try {
    await using disposables = new AsyncDisposableStack();

    activeScopes.load = { disposables, logger };

    const module = await loader();
    const setup = getSetup(module);
    const resources = disposables.move();

    return {
      setup,
      dispose: () => resources.disposeAsync(),
    };
  } finally {
    activeScopes.load = null;
  }
};

/** 获取当前插件模块的日志记录器。 */
export const useLogger = (): Logger => {
  if (!activeScopes.load) {
    throw new Error('useLogger() can only be called while loading a plugin');
  }
  return activeScopes.load.logger;
};

/** 收集插件模块释放时执行的清理函数。 */
export const useDispose = (cleanup: Cleanup): void => {
  if (typeof cleanup !== 'function') {
    throw new TypeError('Plugin cleanup must be a function');
  }

  if (!activeScopes.load) {
    throw new Error('useDispose() can only be called while loading a plugin');
  }
  activeScopes.load.disposables.defer(cleanup);
};

export const mountEffects = async (scope: MountScope): Promise<void> => {
  for (const effect of scope.effects) {
    if (effect.dependencies?.length === 0) {
      await runEffect(effect);
    }
  }
};

export const dispatchEffects = async <Type extends EventType>(
  scope: MountScope,
  type: Type,
  event: ClientEvent<Type>,
): Promise<void> => {
  // RESUMED 的 Payload 是空字符串，因此 Context 是空对象。
  const context = <Context<Type>>(typeof event === 'object' && event !== null ? event : Object.freeze({}));
  const effects = scope.effects.filter(
    effect => effect.dependencies === undefined || effect.dependencies.includes(type),
  );
  const results = await Promise.allSettled(effects.map(effect => runEffect(effect, context)));

  for (const result of results) {
    if (result.status === 'rejected') {
      throw result.reason;
    }
  }
};

export const trackPending = (scope: MountScope, task: Promise<void>): Promise<void> => {
  scope.pending.add(task);
  task.then(
    () => scope.pending.delete(task),
    () => scope.pending.delete(task),
  );

  return task;
};

export const disposeScope = async (scope: MountScope): Promise<void> => {
  if (!scope.disposables) {
    throw new Error('Plugin resources are unavailable');
  }
  const disposables = scope.disposables;
  scope.disposables = null;

  await disposables.disposeAsync();
};

/**
 * 监听 QQ Dispatch 事件。
 *
 * 不传入 dependencies 时监听所有事件。
 */
export function useEvent(callback: (context: Context<EventType>) => void | Promise<void>): void;

/** 在插件挂载时执行一次回调。 */
export function useEvent(callback: () => void | Promise<void>, dependencies: readonly []): void;

/** 监听指定的 QQ Dispatch 事件。 */
export function useEvent<const Dependencies extends readonly [EventType, ...EventType[]]>(
  callback: (context: Context<Dependencies[number]>) => void | Promise<void>,
  // 元组交叉既提供事件名补全，也保留已选事件的精确联合类型。
  dependencies: Dependencies & readonly [EventType, ...EventType[]],
): void;

export function useEvent(callback: unknown, dependencies?: readonly EventType[]): void {
  if (typeof callback !== 'function') {
    throw new TypeError('Event callback must be a function');
  }

  if (dependencies !== undefined) {
    if (!Array.isArray(dependencies)) {
      throw new TypeError('Effect dependencies must be an array');
    }

    for (const dependency of dependencies) {
      if (!(<readonly unknown[]>EVENT_TYPES).includes(dependency)) {
        throw new TypeError(`Unsupported QQ event: ${dependency}`);
      }
    }
  }
  const scope = getActiveMountScope();

  scope.effects.push({
    callback: <EventCallback | MountCallback>callback,
    dependencies: dependencies === undefined ? undefined : [...dependencies],
  });
}
