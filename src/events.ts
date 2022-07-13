import { EventMap, MessageElem } from 'oicq';
import { MessagePort } from 'worker_threads';
import { Option } from './plugin';

// 获取事件类型
type EventType<T> = T extends (arg: infer P) => void ? P & { query: { [k: string]: string } } : any;

export type BotEventMap = {
  [K in keyof EventMap]: EventType<EventMap[K]>;
};

export type PortEventMap = {
  'bot.api': {
    method: string;
    params: any[];
  };
  // 绑定 bot 通信
  'bind.bot.port': {
    uin: number;
    port: MessagePort;
  };
  // 绑定插件通信
  'bind.plugin.port': {
    // 插件名
    name: string;
    port: MessagePort;
  };
  'bind.setting': {
    name: string;
    option: Option;
  };
  // 绑定插件事件监听器
  'bind.plugin.listen': {
    listen: string,
    name: string;
  };
};

export type MessageSendEvent = {
  type: 'private' | 'group';
  message: string | MessageElem[];
  self_id: number;
  user_id: number;
  group_id: number;
};
