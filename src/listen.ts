import { GroupMessageEvent } from 'oicq';

import { Bot } from '.';
import { EventMap } from './events';
import { Option, Plugin } from './plugin';

export class Listen<T extends keyof EventMap = any> {
  public func?: () => any;
  public stop?: () => any;

  constructor(
    private event_name: T,
    private plugin: Plugin,
  ) {

  }

  trigger(callback: (this: Trigger<T>) => any) {
    this.func = callback;
    return this;
  }

  prevent(callback: (this: Trigger<T>) => any) {
    this.stop = callback;
    return this;
  }
}

export class Trigger<T extends keyof EventMap = any>{
  public option?: Option;

  constructor(
    public plugin: Plugin,
    public listen: Listen,
    public bot: Bot,
    public event: EventMap[T],
  ) {
    const group_id = (event as GroupMessageEvent).group_id;
    const plugin_name = this.plugin.getName();

    this.option = group_id ? this.bot.getOption(group_id, plugin_name) : undefined;
  }

  isApply(): boolean {
    return this.option ? this.option.apply : true;
  }
}
