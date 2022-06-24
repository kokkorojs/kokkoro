import { Plugin } from '.';

export class Listen {
  public func?: (event: any) => any;

  constructor(
    private event_name: string,
    public plugin: Plugin,
  ) {
  }

  run(event: any) {
    event.reply = (message: any) => {
      const { message_type, user_id, group_id } = event;

      this.reply({
        name: 'message.send',
        event: {
          type: message_type,
          message, user_id, group_id,
        },
      });
    };

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
