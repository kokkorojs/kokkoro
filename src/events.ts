import { EventMap } from 'oicq';

// 获取事件类型
type EventType<T> = T extends (arg: infer P) => void ? P & { sub_name: string } : { sub_name: string };

export type BotEventMap = {
  [K in keyof EventMap]: EventType<EventMap[K]>;
};
