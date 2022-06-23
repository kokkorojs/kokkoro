import { Plugin } from ".";
import { MessagePort } from 'worker_threads';
import { logger } from "@kokkoro/utils";

export class Listen {
  public func?: (event: any) => any;

  constructor(
    public plugin: Plugin,
  ) {
    logger.debug('new plugin');
  }

  run(event: any) {
    event.reply = this.reply.bind(this);

    if (this.func) {
      this.func(event);
    }
  }

  trigger(callback: (event: any) => any) {
    this.func = callback;
    return this;
  }

  reply(event: any) {
    this.plugin.sendMessage(event);
  }
}
