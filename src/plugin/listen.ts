import { Bot } from '@/core';
import { Event, EventName } from '@/events';
import { BotApiParams, Plugin } from '@/plugin';

export class Listen<K extends EventName = any>  {
  public func?: (event: Event<K>) => any;

  constructor(
    private event_name: string,
    public plugin: Plugin,
  ) {
  }

  run(event: Event<K>) {
    // if (['message', 'message.group', 'message.private'].includes(this.event_name)) {
    // }

    event.botApi = <K extends keyof Bot>(method: K, ...params: BotApiParams<Bot[K]>) => {
      return this.plugin.botApi(event.self_id, method, ...params);
    }

    if (!this.func) {
      return;
    }
    this.func(event);
  }

  trigger(callback: (event: Event<K>) => any) {
    this.func = callback;
    return this;
  }
}
