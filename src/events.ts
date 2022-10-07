import { EventMap, MessageElem } from 'oicq';
import { MessagePort } from 'worker_threads';
import { Option } from './plugin';

// 展开对象 value 类型
type ValueOf<T> = T[keyof T];

// 移除对象指定类型
export type OmitType<T, P> = Omit<
  T,
  {
    [K in keyof T]: T[K] extends P ? K : never
  }[keyof T]
>;

export type EventName = keyof EventMap;

export interface ThreadsMessage {
  event_name: string;
  param: {
    [key: string]: unknown;
  };
}

// 获取事件类型
// type EventType<T> = T extends (arg: infer P) => void ? P & { query: { [k: string]: string } } : any;

export type ContextMap = {
  [Key in EventName]: Parameters<EventMap[Key]>;
};

// export type BotEventMap = {
//   [K in keyof EventMap]: EventType<EventMap[K]>;
// };

// export type PortEventMap = {
//   'bot.api': {
//     method: string;
//     params: any[];
//   };
//   // 绑定 bot 通信
//   'bind.bot.port': {
//     uin: number;
//     port: MessagePort;
//   };
//   // 绑定插件通信
//   'bind.plugin.port': {
//     // 插件名
//     name: string;
//     port: MessagePort;
//   };
//   'bind.setting': {
//     name: string;
//     option: Option;
//   };
//   // 绑定插件事件监听器
//   'bind.plugin.listen': {
//     listen: string,
//     name: string;
//   };
// };

// export type MessageSendEvent = {
//   type: 'private' | 'group';
//   message: string | MessageElem[];
//   self_id: number;
//   user_id: number;
//   group_id: number;
// };
