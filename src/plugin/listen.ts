import { Event } from '@/events';
import { Bot, BotEventName } from "@/core";
import { BotApiParams, Plugin } from '@/plugin';
import { MessageElem } from 'amesu';

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
    event.botApi = <K extends keyof Bot>(method: K, ...params: BotApiParams<Bot[K]>) => {
      return this.plugin.botApi(event.self_id, method, ...params);
    }
    event.reply = (message: string | MessageElem[]) => {
      const { self_id, group_id, user_id } = event;

      if (group_id) {
        return this.plugin.botApi(self_id, 'sendGroupMsg', group_id, message);
      } else if (user_id) {
        return this.plugin.botApi(self_id, 'sendPrivateMsg', user_id, message);
      }
    }

    this.func(event);
  }

  trigger(callback: (event: Event<K>) => any) {
    this.func = callback;
    return this;
  }
}
