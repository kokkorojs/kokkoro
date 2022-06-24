import { EventMap } from 'oicq';
import { MessagePort } from 'worker_threads';

// 获取事件类型
type EventType<T> = T extends (arg: infer P) => void ? P : any;

export type BotEventMap = {
  [K in keyof EventMap]: EventType<EventMap[K]>;
};

export type portEventMap = {
  'bind.event': (event: { name: string, port: MessagePort }) => void
};
