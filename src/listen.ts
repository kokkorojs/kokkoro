import { EventMap } from 'oicq';
import { Plugin } from './plugin';

export class Listen<T extends keyof EventMap = any> {
  name: T;
  func?: EventMap[T];

  constructor(
    public event_name: T,
    public plugin: Plugin,
  ) {
    this.name = event_name;
  }

  action(func: EventMap[T]) {
    this.func = func;
    return this;
  }
}
