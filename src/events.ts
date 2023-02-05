import { DiscussMessageEvent, EventMap, GroupMessageEvent, PrivateMessageEvent } from 'oicq';
import { Bot, PermissionLevel } from '@/core';
import { Option } from '@/plugin';
import { Setting } from '@/config';

export type AllMessageEvent = PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent;

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
  ? (E extends undefined ? {} : E)
  : never;

/** bot 事件名 */
export type EventName = keyof EventMap;

/** bot 事件 */
export type BotEvent<K extends EventName> = EventType<EventMap[K]> & {
  self_id: number;
};

/** 获取 emit 事件回调 context 类型 */
export type ContextType<K extends EventName> = (
  BotEvent<K> extends { group_id: number }
  ? {
    /** 群插件设置 */
    setting: Setting;
    /** 群配置项 */
    option: Option;
  }
  : void
)
  & (BotEvent<K> extends { message_id: string }
    ? {
      /** 权限等级 */
      permission_level: PermissionLevel;
      /** 指令参数 */
      query: Record<string, any>;
    }
    : void
  )
  & Record<string, any>;

/** 插件上下文 */
export type Context<K extends EventName> = BotEvent<K> & ContextType<K> & {
  /** 快捷修改插件配置项 */
  revise: (key: string, value: any, plugin?: string) => Promise<boolean>;
  /** 获取 bot 实例 */
  getBot: (uin: number) => Bot | undefined;
};
