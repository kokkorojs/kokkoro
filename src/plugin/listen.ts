import { MessageElem } from 'oicq';

import { Plugin } from '@/plugin';
import { Context } from '@/events';

export class Listen<T extends keyof Context = any>  {
  public func?: (event: Context[T]) => any;

  constructor(
    private event_name: string,
    public plugin: Plugin,
  ) {
  }

  run(event: any) {
    event.reply = (message: string | MessageElem[]) => {
      const { message_type, user_id, group_id, self_id } = event;

      // this.reply({
      //   type: message_type,
      //   message, self_id, user_id, group_id,
      // });
    };

    if (this.func) {
      this.func(event);
    }
  }

  trigger(callback: (event: Context[T]) => any) {
    this.func = callback;
    return this;
  }

  // reply(event: PortEventMap['message.send']) {
  //   this.plugin.sendMessage(event);
  // }
}
