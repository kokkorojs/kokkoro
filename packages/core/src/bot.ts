import { Client, ClientConfig } from 'amesu';
import { CommandContext, EventName, pluginList } from '@/plugin/index.js';

export interface BotConfig extends ClientConfig {
  plugins?: string[];
}

export class Bot extends Client {
  public plugins: Set<string>;

  constructor(config: BotConfig) {
    super(config);

    this.plugins = new Set(config.plugins ?? []);
    this.usePluginEvent();
  }

  private usePluginEvent() {
    this.useEventInterceptor(dispatch => {
      const ctx = {
        api: this.api,
        t: dispatch.t,
        ...dispatch.d,
      };
      const name = this.parseEventName(dispatch.t);

      pluginList.forEach(async plugin => {
        if (this.plugins.size && !this.plugins.has(plugin.name)) {
          return;
        }
        let state = plugin.memoizedState;

        while (state !== null) {
          let message: string | null;

          if (state.events.includes(name)) {
            try {
              message = (await state.action.call(plugin.effect, ctx)) ?? null;
            } catch (error) {
              message = error instanceof Error ? error.message : JSON.stringify(error);
              this.logger.error(message);
            }

            if (ctx.reply && message) {
              <CommandContext['reply']>ctx.reply({ msg_type: 0, content: message }).catch(() => {});
            }
          }
          state = state.next;
        }
      });
      return dispatch;
    });
  }

  private parseEventName(type: string): EventName {
    const name = type.replace(/_/g, '.').toLowerCase();
    return /\./.test(name) ? <EventName>name : <EventName>`session.${name}`;
  }
}
