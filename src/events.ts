import { EventMap } from 'oicq';

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

// 获取插件上下文
type getContext<T> = T extends (arg: infer P) => void ? OmitType<P, Function> & {
  /** 指令集匹配到的参数 */
  query: { [k: string]: string }
} : never;

export type ContextMap = {
  [Key in EventName]: getContext<EventMap[Key]>;
};

export type Context<Key extends keyof ContextMap = keyof ContextMap> = ContextMap[Key];
