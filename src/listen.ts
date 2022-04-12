import { EventMap } from 'oicq';
import { Plugin } from './plugin';

export class Listen<T extends keyof EventMap = any> {
  func?: EventMap[T];

  constructor(
    private event_name: T,
    private plugin: Plugin,
  ) {

  }

  action(func: EventMap[T]) {
    this.func = func;
    return this;
  }
}
