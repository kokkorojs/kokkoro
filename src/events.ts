import { EventMap, MessageElem } from 'oicq';
import { Option } from './plugin';

// 获取事件类型
type EventType<T> = T extends (arg: infer P) => void ? P & { query: { [k: string]: string } } : any;

export type BotEventMap = {
  [K in keyof EventMap]: EventType<EventMap[K]>;
};

export type PortEventMap = {
  'bot.api': {
    name: string;
    params: any[];
  };
  'bind.setting': {
    name: string;
    option: Option;
  };
  'bind.plugin': {
    name: string;
    plugin: string,
    prefix: string;
  };
  'message.send': MessageSendEvent;
};

export type MessageSendEvent = {
  type: 'private' | 'group';
  message: string | MessageElem[];
  self_id: number;
  user_id: number;
  group_id: number;
};


