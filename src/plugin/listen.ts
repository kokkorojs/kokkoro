import { Plugin } from '@/plugin';
import { Context, EventName } from '@/events';

export class Listen<K extends EventName = any>  {
  private func?: (event: Context<K>) => any;

  constructor(
    private plugin: Plugin,
  ) {

  }

  run(context: Context<K>) {
    if (!this.func) {
      return;
    }
    const name = this.plugin.getName();
    const option = context.setting?.[name];
    const disable = context.disable;

    if (disable.includes(name) || option?.apply === false) {
      return;
    }
    if (option) {
      context.option = option;
    }

    this.func(context);
  }

  trigger(callback: (context: Context<K>) => any) {
    this.func = callback;
    return this;
  }
}
