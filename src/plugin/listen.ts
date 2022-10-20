import { Plugin } from '@/plugin';
import { Event, EventName } from '@/events';

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
