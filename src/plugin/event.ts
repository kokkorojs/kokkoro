import { Plugin } from '@/plugin';
import { Context, EventName } from '@/events';

export class Event<K extends EventName = any>  {
  private func?: (event: Context<K>) => any;

  constructor(
    private plugin: Plugin,
  ) {

  }

  public handle(context: Context<K>) {
    if (!this.func) {
      return;
    }
    const name = this.plugin.getName();
    const option = context.setting?.[name];

    if (option?.apply === false) {
      return;
    }
    context.option = option;

    this.func(context);
  }

  public action(callback: (context: Context<K>) => any) {
    this.func = async (ctx) => {
      try {
        await callback(ctx);
      } catch (error) {
        this.plugin.logger.error(error);
      }
    };
    return this;
  }
}
