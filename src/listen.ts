import { EventMap } from 'oicq';
import { Extension } from './extension';

export class Listen<T extends keyof EventMap = any> {
  name: T;
  func?: EventMap[T];

  constructor(
    public event_name: T,
    public extension: Extension,
  ) {
    this.name = event_name;
  }

  action(func: EventMap[T]) {
    this.func = func;
    return this;
  }
}
