import { EventMap } from 'oicq';

import { Bot } from '.';
import { commandEvent } from './command';
import { Option, Plugin } from './plugin';

export class Listen<T extends keyof EventMap = any> {
  public func?: EventMap[T];
  public stop?: EventMap[T];

  constructor(
    private event_name: T,
    private plugin: Plugin,
  ) {

  }

  trigger(callback: EventMap<Bot>[T]) {
    this.func = callback;
    return this;
  }

  prevent(callback: (this: this, ...args: any[]) => any) {
    this.stop = callback;
    return this;
  }
}

export class Trigger<T extends keyof commandEvent = any>{
  public option?: Option;

  constructor(
    public plugin: Plugin,
    public listen: Listen,
    public bot: Bot,
    public event: commandEvent[T],
  ) {

  }

  isApply(): boolean {
    return this.option ? this.option.apply : false;
  }
}