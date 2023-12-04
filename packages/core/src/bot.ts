import { Client, ClientConfig } from 'amesu';
import { CommandEvent } from '@/plugin/command.js';
import { EventName, pluginList } from '@/plugin/index.js';

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
      const data = { t: dispatch.t, ...dispatch.d };
      const name = this.parseEventName(dispatch.t);

      pluginList.forEach(async plugin => {
        if (this.plugins.size && !this.plugins.has(plugin.name)) {
          return;
        }
        let event = plugin.memoizedEvent;

        while (event !== null) {
          let message: string | null;

          if (event.names.includes(name)) {
            try {
              message = (await event.action(data, this)) ?? null;
            } catch (error) {
              message = error instanceof Error ? error.message : JSON.stringify(error);
              this.logger.error(message);
            }

            if (data.reply && message) {
              <CommandEvent['reply']>data.reply({ msg_type: 0, content: message }).catch(() => {});
            }
          }
          event = event.next;
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
