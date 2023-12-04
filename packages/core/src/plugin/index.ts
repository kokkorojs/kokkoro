import { ClientEvent } from 'amesu';
import { Plugin } from '@/plugin/hooks.js';

/** 事件名 */
export type EventName = keyof ClientEvent;
/** 事件类型 */
export type EventType<K extends EventName[]> = {
  [P in K[number]]: ClientEvent[P] extends (event: infer E) => void ? E : never;
}[K[number]];

/** 元数据 */
export interface Metadata {
  /** 名称 */
  name: string;
  /** 描述 */
  description?: string;
}

export class PluginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginError';
  }
}

export const pluginList = new Map<string, Plugin>();

export * from '@/plugin/hooks.js';
