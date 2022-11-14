import { ClientEventMap } from 'amesu';

import { Setting } from '@/config';
import { BotApiParams, Option, PluginMessage } from '@/plugin';
import { ApiTaskEvent, Bot, BotEventName, BotMessage, PermissionLevel } from '@/core';
import { BroadcastLinkEvent, PluginMountEvent, PluginUnmountEvent, ThreadMessage } from '@/worker';

/** 展开对象 value 类型 */
type ValueOf<T> = T[keyof T];

/** 移除对象指定类型 */
type OmitType<T, P> = Omit<
  T,
  {
    [K in keyof T]: T[K] extends P ? K : never
  }[keyof T]
>;

// /** 消息事件名 */
// export type EventName = keyof ClientEventMap;

/** 获取事件回调 event 参数 */
export type Parameter<T> = T extends (event: infer P) => void ? P : never;

// /** bot 线程消息地图 */
// type PostMessageMap = {
//   [Key in EventName]: (event: OmitType<ClientEventMap[Key], Function>) => void;
// };

type GetContext<K extends BotEventName> = OmitType<ClientEventMap[K], Function>;

// /** 线程事件 */
// export type ThreadEvent<T extends ThreadEventMap[EventName]> = T extends (event: infer E) => void ? E : never;

export type ContextName = 'message' | 'message.group' | 'message.private';

/** 指令上下文 */
export type Context<K extends ContextName> = GetContext<K> & {
  self_id: number;
  group_id?: number;
  query: {
    [key: string]: any;
  };
  /** 群配置项 */
  option: Option;
  /** 群插件设置 */
  setting: Setting;
  /** 插件禁用清单 */
  disable: Set<string>;
  /** 权限等级 */
  permission_level: PermissionLevel;
  /** 快捷回复 */
  reply(message: string): void;
  /** bot api */
  botApi: <K extends keyof Bot>(method: K, ...params: BotApiParams<Bot[K]>) => Promise<Bot[K]>;
};

/** 指令事件 */
export type Event<K extends BotEventName> = GetContext<K> & {
  self_id: number;
  user_id?: number;
  group_id?: number;
  /** 群配置项 */
  option?: Option;
  /** 群插件设置 */
  setting?: Setting;
  /** 插件禁用清单 */
  disable: Set<string>;
  /** 快捷回复 */
  reply?(message: string): void;
  /** bot api */
  botApi: <K extends keyof Bot>(method: K, ...params: BotApiParams<Bot[K]>) => Promise<Bot[K]>;
};

// export type AllMessage = PrivateMessage | GroupMessage | DiscussMessage;

/** 工作线程事件地图 */
export interface ThreadEventMap<T = any> {
  // 原生事件
  'error': (err: Error) => void;
  'exit': (exitCode: number) => void;
  'message': (value: any) => void;
  'messageerror': (error: Error) => void;
  'online': () => void;

  /** 引发未捕获的异常 */
  "thread.error": (this: T, error: Error) => void;
  /** 线程停止 */
  "thread.exit": (this: T, code: number) => void;
  /** 调用 parentPort.postMessage() */
  "thread.message": (this: T, message: ThreadMessage) => void;
  /** 反序列化消息失败 */
  "thread.messageerror": (this: T, error: Error) => void;
  /** 开始执行 JavaScript 代码 */
  "thread.online": (this: T) => void;
  "thread.task": (this: T, event: ApiTaskEvent) => void;
  "thread.broadcast.link": (this: T) => void;
  "thread.bot.created": (this: T) => void;
  "thread.plugin.created": (this: T) => void;
  /** 控制台输入流 */
  "thread.process.stdin": (this: T, prefix?: string) => void;
  /** 挂载插件 */
  "thread.plugin.mount": (this: T, event: PluginMountEvent) => void;
  /** 卸载插件 */
  "thread.plugin.unmount": (this: T, event: PluginUnmountEvent) => void;
  /** 重载插件 */
  "thread.plugin.reload": (this: T, event: PluginUnmountEvent) => void;
}

/** bot 事件地图 */
export interface BotEventMap<T = any> {
  // 原生事件
  'close': () => void;
  'message': (value: any) => void;
  'messageerror': (error: Error) => void;

  /** 通道断开连接 */
  "bot.close": (this: T) => void;
  /** 调用 parentPort.postMessage() */
  "bot.message": (this: T, message: BotMessage) => void;
  /** 反序列化消息失败 */
  "bot.messageerror": (this: T, error: Error) => void;
  /** 绑定插件线程通信 */
  "bot.api.task": (this: T, event: ApiTaskEvent) => void;
  "bot.broadcast.link": (this: T, event: BroadcastLinkEvent) => void;
  // "thread.process.stdout": (this: T, content: string) => void;
}

/** 插件事件地图 */
export interface PluginEventMap<T = any> {
  // 原生事件
  'close': () => void;
  'message': (value: any) => void;
  'messageerror': (error: Error) => void;

  /** 通道断开连接 */
  "plugin.close": (this: T) => void;
  /** 调用 parentPort.postMessage() */
  "plugin.message": (this: T, message: PluginMessage) => void;
  /** 反序列化消息失败 */
  "plugin.messageerror": (this: T, error: Error) => void;
  /** 连接广播通信 */
  "plugin.broadcast.link": (this: T, event: BroadcastLinkEvent) => void;
  "plugin.destroy": (this: T, code: number) => void;
}
