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

/** 事件上下文，包含展开后的事件字段和当前 Bot。 */
export type Context<Type extends EventType = EventType> = (Type extends EventType
  ? ClientEvent<Type> extends object
    ? ClientEvent<Type>
    : Record<never, never>
  : never) & {
  /** 当前 Bot。 */
  readonly bot: Bot;
};

type MountContext = Pick<Context, 'bot'>;

/**
 * 避免 TypeScript 把返回其他值的函数视为合法的 void 回调。
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/2/functions.html#return-type-void TypeScript void return type}
 * @see {@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/index.d.ts React VoidOrUndefinedOnly}
 */
declare const UNDEFINED_VOID_ONLY: unique symbol;

type VoidOrUndefinedOnly = void | { [UNDEFINED_VOID_ONLY]: never };

/** 同步调用 Hook 的插件函数。 */
export type Plugin = () => VoidOrUndefinedOnly;

/** 用于动态导入默认 Plugin 的函数。 */
export type PluginLoader = () => Promise<{ readonly default: Plugin }>;

/** `Bot.mount()` 与 `Bot.unmount()` 接受的插件来源。 */
export type PluginSource = Plugin | PluginLoader;

/** 释放 Effect 资源的函数。 */
export type Cleanup = () => void | Promise<void>;

type EffectSetup = (context: Context | MountContext) => unknown;

interface Effect {
  readonly setup: EffectSetup;
  readonly dependencies: readonly EventType[] | undefined;
  cleanup?: Cleanup;
  transition: Promise<void>;
}

export interface EffectScope {
  readonly effects: Effect[];
  readonly commands: CommandRegistration[];
  readonly pending: Set<Promise<void>>;
  disposables: AsyncDisposableStack | null;
  status: 'mounting' | 'mounted' | 'unmounting';
}

/** 同步 render 期间使用的 Hook 收集作用域。 */
let currentScope: EffectScope | null = null;

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return false;
  }

  return typeof (<{ then?: unknown }>value).then === 'function';
};

const getCurrentScope = (): EffectScope => {
  if (!currentScope) {
    throw new Error('Hooks can only be called while mounting a plugin');
  }

  return currentScope;
};

/** Hook 只在同步调用链中收集。等待 Loader 时立即恢复原作用域。 */
const invokeWithScope = (scope: EffectScope, callback: () => unknown): unknown => {
  const previous = currentScope;

  currentScope = scope;

  try {
    return callback();
  } finally {
    currentScope = previous;
  }
};

const getDefaultPlugin = (module: unknown): Plugin => {
  // 异步 Plugin 会解析为 undefined，属于同步 render 约束错误。
  if (module === undefined) {
    throw new TypeError('Plugin must be synchronous');
  }
  if (typeof module !== 'object' || module === null || !Object.hasOwn(module, 'default')) {
    throw new TypeError('Plugin loader must resolve to a module with a default export');
  }
  const plugin = (<{ readonly default: unknown }>module).default;

  if (typeof plugin !== 'function') {
    throw new TypeError('Plugin module default export must be a function');
  }
  return <Plugin>plugin;
};

const validatePluginResult = async (result: unknown): Promise<void> => {
  if (isPromiseLike(result)) {
    try {
      await result;
    } catch (cause) {
      throw new TypeError('Plugin must be synchronous', { cause });
    }

    throw new TypeError('Plugin must be synchronous');
  }
  if (result !== undefined) {
    throw new TypeError('Plugin must return void');
  }
};

const disposeEffect = async (effect: Effect): Promise<void> => {
  await effect.transition;
  const cleanup = effect.cleanup;

  effect.cleanup = undefined;
  await cleanup?.();
};

const setupMountEffect = async (effect: Effect, context: MountContext): Promise<void> => {
  const result = effect.setup(context);
  const cleanup = isPromiseLike(result) ? await result : result;

  if (cleanup === undefined) {
    return;
  }

  if (typeof cleanup !== 'function') {
    throw new TypeError('Effect setup must return void or a cleanup function');
  }
  effect.cleanup = <Cleanup>cleanup;
};

const setupEventEffect = async (effect: Effect, context: Context): Promise<void> => {
  const previous = effect.transition;
  const { promise, resolve } = Promise.withResolvers<void>();

  effect.transition = promise;

  try {
    await previous;
    const cleanup = effect.cleanup;

    effect.cleanup = undefined;
    await cleanup?.();

    const result = effect.setup(context);

    if (isPromiseLike(result)) {
      // 异步处理函数不会返回 cleanup，无需阻塞同一 Effect 的下一次调用。
      resolve();

      if ((await result) !== undefined) {
        throw new TypeError('Event setup promises must resolve to void');
      }
      return;
    }
    if (result !== undefined && typeof result !== 'function') {
      throw new TypeError('Effect setup must return void, a Promise, or a cleanup function');
    }
    effect.cleanup = result === undefined ? undefined : <Cleanup>result;
  } finally {
    resolve();
  }
};

export const createEffectScope = (): EffectScope => ({
  effects: [],
  commands: [],
  pending: new Set(),
  disposables: null,
  status: 'mounting',
});

export const collectCommand = (command: CommandRegistration): EffectScope => {
  const scope = getCurrentScope();

  scope.commands.push(command);
  return scope;
};

export const assertCurrentScope = (scope: EffectScope): void => {
  if (currentScope !== scope) {
    throw new Error('Command shortcuts can only be registered while mounting a plugin');
  }
};

export const renderPlugin = async (scope: EffectScope, source: PluginSource): Promise<void> => {
  const result = invokeWithScope(scope, source);

  if (!isPromiseLike(result)) {
    await validatePluginResult(result);
    return;
  }
  const module = await result;

  if (scope.effects.length > 0 || scope.commands.length > 0) {
    throw new TypeError('Plugin loader cannot register hooks');
  }

  await validatePluginResult(invokeWithScope(scope, getDefaultPlugin(module)));
};

export const mountEffects = async (scope: EffectScope, bot: Bot): Promise<void> => {
  await using disposables = new AsyncDisposableStack();
  const context = Object.freeze({ bot });

  for (const effect of scope.effects) {
    disposables.defer(() => disposeEffect(effect));
  }

  for (const effect of scope.effects) {
    if (effect.dependencies?.length === 0) {
      await setupMountEffect(effect, context);
    }
  }

  // 只有全部 setup 成功后才转移资源所有权。失败时资源栈会按 LIFO 顺序自动回滚。
  scope.disposables = disposables.move();
};

export const dispatchEffects = async <Type extends EventType>(
  scope: EffectScope,
  bot: Bot,
  type: Type,
  event: ClientEvent<Type>,
): Promise<void> => {
  // RESUMED 的 Payload 是空字符串，因此 Context 中只有 bot。
  const context = <Context<Type>>Object.freeze({
    ...(typeof event === 'object' && event !== null ? event : {}),
    bot,
  });
  const effects = scope.effects.filter(
    effect => effect.dependencies === undefined || effect.dependencies.includes(type),
  );
  const results = await Promise.allSettled(effects.map(effect => setupEventEffect(effect, context)));

  for (const result of results) {
    if (result.status === 'rejected') {
      throw result.reason;
    }
  }
};

export const trackPending = (scope: EffectScope, task: Promise<void>): Promise<void> => {
  scope.pending.add(task);
  task.then(
    () => scope.pending.delete(task),
    () => scope.pending.delete(task),
  );

  return task;
};

export const disposeEffects = async (scope: EffectScope): Promise<void> => {
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
export function useEvent(setup: (context: Context<EventType>) => void | Promise<void> | Cleanup): void;

/** 在插件挂载时执行一次 setup。 */
export function useEvent(
  setup: (context: MountContext) => void | Cleanup | Promise<void | Cleanup>,
  dependencies: readonly [],
): void;

/** 监听指定的 QQ Dispatch 事件。 */
export function useEvent<const Dependencies extends readonly [EventType, ...EventType[]]>(
  setup: (context: Context<Dependencies[number]>) => void | Promise<void> | Cleanup,
  // 元组交叉既提供事件名补全，也保留已选事件的精确联合类型。
  dependencies: Dependencies & readonly [EventType, ...EventType[]],
): void;

export function useEvent(setup: unknown, dependencies?: readonly EventType[]): void {
  if (typeof setup !== 'function') {
    throw new TypeError('Effect setup must be a function');
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
  const scope = getCurrentScope();

  scope.effects.push({
    setup: <EffectSetup>setup,
    dependencies: dependencies === undefined ? undefined : [...dependencies],
    transition: Promise.resolve(),
  });
}
