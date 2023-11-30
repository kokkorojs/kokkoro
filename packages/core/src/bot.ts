import { none } from '@kokkoro/utils';
import { Bot as Client, BotConfig as ClientConfig } from 'amesu';
import { CommandEvent, pluginList } from '@/plugin.js';

type Reply = CommandEvent['reply'];

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
      const event = this.parseEvent(dispatch.t);

      pluginList.forEach(plugin => {
        if (this.plugins.size && !this.plugins.has(plugin.name)) {
          return;
        }
        plugin.handles.forEach(async handle => {
          const is_event = event === handle.event;
          const is_command = !handle.event && /at\.message/.test(event);

          if (!is_event && !is_command) {
            return;
          }
          const data = { t: dispatch.t, ...dispatch.d };

          try {
            const message = await handle.method(data, this);

            if (is_command && message) {
              <Reply>data.reply({ msg_type: 0, content: message }).catch(none);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : JSON.stringify(error);

            if (is_command) {
              <Reply>data.reply({ msg_type: 0, content: message }).catch(none);
            }
            this.logger.error(message);
          }
        });
      });
      return dispatch;
    });
  }

  private parseEvent(type: string): string {
    const event = type.replace(/_/g, '.').toLowerCase();
    return /\./.test(event) ? event : `session.${event}`;
  }
}
