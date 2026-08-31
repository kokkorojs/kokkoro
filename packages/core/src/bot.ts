import {
  type ClientEvent,
  type ClientOptions,
  type GroupMessage,
  type MediaMessage,
  type UserMessage,
  Client,
} from 'chobits';

import { type CommandEventType, type MountedCommand, COMMAND_EVENT_TYPES, createCommandTasks } from './command';
import {
  type EffectScope,
  type EventType,
  type PluginSetup,
  createEffectScope,
  dispatchEffects,
  disposeScope,
  EVENT_TYPES,
  mountEffects,
  render,
  trackPending,
} from './plugin';

/** 发送图片时附带的消息参数。 */
export type SendImagePayload = Omit<MediaMessage, 'image' | 'media' | 'msg_type'>;

/** 支持 Hook 插件的 QQ 机器人客户端。 */
export class Bot<
  CustomEvents extends Record<keyof CustomEvents, unknown[]> = Record<never, never>,
> extends Client<CustomEvents> {
  private readonly scopes = new Map<PluginSetup, EffectScope>();
  private readonly commands = new Map<string, MountedCommand>();

  /** @param options Chobits 客户端选项。 */
  public constructor(options: ClientOptions) {
    super(options);

    for (const type of EVENT_TYPES) {
      this.subscribe(type);
    }
  }

  /** 向指定用户发送图片。 */
  public async sendUserImage(user_openid: string, url: string, payload: SendImagePayload = {}): Promise<UserMessage> {
    const { file_info } = await this.uploadUserFile(user_openid, {
      file_type: 1,
      url,
      srv_send_msg: false,
    });

    return this.sendUserMessage(user_openid, { ...payload, msg_type: 7, media: { file_info } });
  }

  /** 向指定群聊发送图片。 */
  public async sendGroupImage(
    group_openid: string,
    url: string,
    payload: SendImagePayload = {},
  ): Promise<GroupMessage> {
    const { file_info } = await this.uploadGroupFile(group_openid, {
      file_type: 1,
      url,
      srv_send_msg: false,
    });

    return this.sendGroupMessage(group_openid, { ...payload, msg_type: 7, media: { file_info } });
  }

  /**
   * 挂载插件。
   *
   * Core 以传入的 PluginSetup 引用识别挂载。
   */
  public async mount(setup: PluginSetup): Promise<void> {
    if (typeof setup !== 'function') {
      throw new TypeError('Plugin setup must be a function');
    }
    if (this.scopes.has(setup)) {
      throw new Error('Plugin setup is already mounted');
    }
    const scope = createEffectScope();

    this.scopes.set(setup, scope);
    await using disposables = new AsyncDisposableStack();

    try {
      const cleanup = await render(scope, setup, this);

      if (cleanup) {
        disposables.defer(cleanup);
      }
      this.mountCommands(scope);
      await mountEffects(scope);
      scope.disposables = disposables.move();
      scope.status = 'mounted';
    } catch (error) {
      this.unmountCommands(scope);
      this.scopes.delete(setup);
      throw error;
    }
  }

  /** 停止接收新任务，等待正在执行的任务结束，然后执行清理函数。 */
  public async unmount(setup: PluginSetup): Promise<void> {
    if (typeof setup !== 'function') {
      throw new TypeError('Plugin setup must be a function');
    }
    const scope = this.scopes.get(setup);

    if (!scope || scope.status !== 'mounted') {
      throw new Error('Plugin setup is not mounted');
    }
    scope.status = 'unmounting';
    this.unmountCommands(scope);

    await Promise.allSettled([...scope.pending]);

    try {
      await disposeScope(scope);
    } finally {
      this.scopes.delete(setup);
    }
  }

  private subscribe<Type extends EventType>(type: Type): void {
    this.on(type, event => this.handleEvent(type, event));
  }

  private async handleEvent<Type extends EventType>(type: Type, event: ClientEvent<Type>): Promise<void> {
    // 先登记任务，再执行回调，确保卸载会等待当前事件。
    const tasks: Promise<void>[] = [...this.scopes.values()]
      .filter(scope => scope.status === 'mounted')
      .map(scope =>
        trackPending(
          scope,
          Promise.resolve().then(() => dispatchEffects(scope, type, event)),
        ),
      );

    if (COMMAND_EVENT_TYPES.includes(<CommandEventType>type)) {
      for (const task of createCommandTasks(
        [...this.commands.values()].filter(({ scope }) => scope.status === 'mounted'),
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
