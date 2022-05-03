import { GroupMessageEvent } from 'oicq';

import { Bot, UserLevel } from './bot';
import { Option, Plugin } from './plugin';
import { Command, commandEvent, CommandMessageType } from './command';

export class Action<T extends keyof commandEvent = CommandMessageType> {
  public option?: Option;

  constructor(
    public plugin: Plugin,
    public command: Command,
    public bot: Bot,
    public event: commandEvent[T],
  ) {
    const group_id = (event as GroupMessageEvent).group_id;
    const plugin_name = this.plugin.getName();

    this.option = group_id ? this.bot.getOption(group_id, plugin_name) : undefined;
  }

  isApply(): boolean {
    return this.option ? this.option.apply : false;
  }

  getLevel(): UserLevel {
    return this.bot.getUserLevel(this.event);
  }
}
