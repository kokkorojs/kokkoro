import { DiscussMessageEvent, EventMap, GroupMessageEvent, PrivateMessageEvent } from 'oicq';

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
  ? E extends undefined ? {} : E
  : never;

/** bot 事件名 */
export type EventName = keyof EventMap;

/** bot 事件 */
export type BotEvent<K extends EventName> = EventType<EventMap[K]> & {
  self_id: number;
};
