import { type ClientEvent, type ClientOptions, Client } from 'chobits';

import { type CommandEventType, type MountedCommand, COMMAND_EVENT_TYPES, createCommandTasks } from './command';
import {
  type EffectScope,
  type EventType,
  type PluginSource,
  createEffectScope,
  dispatchEffects,
  disposeEffects,
  EVENT_TYPES,
  mountEffects,
  renderPlugin,
  trackPending,
} from './plugin';

/** 支持 Hook 插件的 QQ 机器人客户端。 */
export class Bot<
  CustomEvents extends Record<keyof CustomEvents, unknown[]> = Record<never, never>,
> extends Client<CustomEvents> {
  private readonly scopes = new Map<PluginSource, EffectScope>();
  private readonly commands = new Map<string, MountedCommand>();

  /** @param options Chobits 客户端选项。 */
  public constructor(options: ClientOptions) {
    super(options);

    for (const type of EVENT_TYPES) {
      this.subscribe(type);
    }
  }

  /**
   * 挂载插件。
   *
   * Core 以传入的函数引用识别插件。
   */
  public async mount(source: PluginSource): Promise<void> {
    if (typeof source !== 'function') {
      throw new TypeError('Plugin source must be a function');
    }
    if (this.scopes.has(source)) {
      throw new Error('Plugin is already mounted');
    }
    const scope = createEffectScope();

    this.scopes.set(source, scope);

    try {
      await renderPlugin(scope, source);
      this.mountCommands(scope);
      await mountEffects(scope, this);
      scope.status = 'mounted';
    } catch (error) {
      this.unmountCommands(scope);
      this.scopes.delete(source);
      throw error;
    }
  }

  /** 停止接收新任务，等待正在执行的任务结束，然后释放 Effect 资源。 */
  public async unmount(source: PluginSource): Promise<void> {
    if (typeof source !== 'function') {
      throw new TypeError('Plugin source must be a function');
    }
    const scope = this.scopes.get(source);

    if (!scope || scope.status !== 'mounted') {
      throw new Error('Plugin is not mounted');
    }
    scope.status = 'unmounting';
    this.unmountCommands(scope);

    await Promise.allSettled([...scope.pending]);

    try {
      await disposeEffects(scope);
    } finally {
      this.scopes.delete(source);
    }
  }

  private subscribe<Type extends EventType>(type: Type): void {
    this.on(type, event => this.handleEvent(type, event));
  }

  private async handleEvent<Type extends EventType>(type: Type, event: ClientEvent<Type>): Promise<void> {
    const tasks: Promise<void>[] = [...this.scopes.values()]
      .filter(scope => scope.status === 'mounted')
      .map(scope => trackPending(scope, dispatchEffects(scope, this, type, event)));

    if (COMMAND_EVENT_TYPES.includes(<CommandEventType>type)) {
      for (const task of createCommandTasks(
        [...this.commands.values()].filter(({ scope }) => scope.status === 'mounted'),
        this,
        // TypeScript 无法通过这个运行时判断缩窄 `ClientEvent<Type>`。
        <ClientEvent<CommandEventType>>(<unknown>event),
      )) {
        tasks.push(task.scope ? trackPending(task.scope, task.promise) : task.promise);
      }
    }
    const results = await Promise.allSettled(tasks);

    for (const result of results) {
      if (result.status === 'rejected') {
        throw result.reason;
      }
    }
  }

  private mountCommands(scope: EffectScope): void {
    const prefixes = new Set<string>();

    // 先完成全部冲突校验，避免注册表留下部分结果。
    for (const command of scope.commands) {
      if (prefixes.has(command.prefix) || this.commands.has(command.prefix)) {
        throw new Error(`Command prefix is already mounted: ${command.prefix}`);
      }
      prefixes.add(command.prefix);
    }

    for (const command of scope.commands) {
      this.commands.set(command.prefix, { command, scope });
    }
  }

  private unmountCommands(scope: EffectScope): void {
    for (const command of scope.commands) {
      const mounted = this.commands.get(command.prefix);

      if (mounted?.scope === scope) {
        this.commands.delete(command.prefix);
      }
    }
  }
}
