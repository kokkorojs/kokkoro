import { Event } from '@/events';
import { Bot, BotEventName } from "@/core";
import { BotApiParams, Plugin } from '@/plugin';

export class Listen<K extends BotEventName = any>  {
  private func?: (event: Event<K>) => any;

  constructor(
    private plugin: Plugin,
  ) {

  }

  run(event: Event<K>) {
    if (!this.func) {
      return;
    }
    const plugin_name = this.plugin.getName();
    const option = event.setting?.[plugin_name];
    const disable = event.disable;

    if (disable.has(plugin_name) || option?.apply === false) {
      return;
    }
    event.option = option;
    event.botApi = <K extends keyof Bot>(method: K, ...params: BotApiParams<Bot[K]>) => {
      return this.plugin.botApi(event.self_id, method, ...params);
    }

    this.func(event);
  }

  trigger(callback: (event: Event<K>) => any) {
    this.func = callback;
    return this;
  }
}
