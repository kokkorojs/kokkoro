import { EventMap } from 'oicq';

import { Option } from '@/plugin';
import { Setting } from '@/config';
import { Bot, PermissionLevel } from '@/core';

/** 展开对象 value 类型 */
export type ValueOf<T> = T[keyof T];

/** 移除对象指定类型 */
export type OmitType<T, P> = Omit<
  T,
  {
    [K in keyof T]: T[K] extends P ? K : never
  }[keyof T]
>;

/** 获取 emit 事件回调 event 类型 */
export type EventType<T extends (...args: any) => any> = T extends (event: infer E) => void
  ? E extends undefined ? {} : E
  : never;

/** bot 事件名 */
export type EventName = keyof EventMap;

/** bot 事件 */
export type BotEvent<K extends EventName> = EventType<EventMap[K]> & {
  self_id: number;
};

/** bot emit 事件 */
export interface EmitEvent<K extends EventName = any> {
  name: K;
  data: BotEvent<K>;
}

export interface ProfileDefineEvent {
  name: string;
  option: Option;
}

/** bot 事件地图 */
export interface BotEventMap<T = any> extends EventMap {
  /** 发送 */
  "bot.emit": (this: T, event: EmitEvent) => void;

  /** 配置定义 */
  "bot.profile.define": (this: T, event: ProfileDefineEvent) => void;
  /** 配置刷新 */
  "bot.profile.refresh": (this: T) => void;
}

export type ContextName = 'message' | 'message.group' | 'message.private';

export type ContextType<K extends EventName> = K extends ContextName ? {
  // group_id?: number;
  /** 权限等级 */
  permission_level: PermissionLevel;
  query: {
    [key: string]: any;
  };
} : {

  };

/** 插件上下文 */
export type Context<K extends EventName> = ContextType<K> & BotEvent<K> & {
  /** 群插件设置 */
  setting?: Setting;
  /** 群配置项 */
  option?: Option;
  /** 插件禁用清单 */
  disable: string[];
  /** 获取 bot 实例 */
  getBot: () => Bot;
};
