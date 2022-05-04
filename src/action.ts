import { GroupMessageEvent } from 'oicq';

import { Bot, UserLevel } from './bot';
import { writeSetting } from './setting';
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

  /**
   * 修改插件设置
   * 
   * @param key - 参数键
   * @param value - 参数值
   */
  async update(key: string, value: string): Promise<string> {
    const plugin_name = this.plugin.getName();

    if (this.event.message_type !== 'group' || plugin_name === 'kokkoro') {
      throw new Error('嘿，你不该来这里的 o(*≧д≦)o!!');
    }
    const group_id = this.event.group_id;
    const option = this.bot.getOption(group_id, plugin_name);
    const old_value = option[key];

    let message = '';
    let new_value: string | number | boolean | Array<string | number>;

    switch (true) {
      case ['true', 'false'].includes(value):
        new_value = value === 'true';
        break;
      case /^(-?[1-9]\d*|0)$/.test(value):
        new_value = +value;
        break;
      default:
        new_value = value;
        break;
    }

    // 校验参数是否合法
    switch (true) {
      case old_value === new_value:
        message = `Error: "${key}" 当前值相等`;
        break;
      case !Array.isArray(old_value) && typeof old_value !== typeof new_value:
        if (old_value) {
          message = `Error: "${key}" 应为 ${typeof old_value} 类型值`;
        } else {
          message = `Error: "${key}" is not defined`;
        }
        break;
      case Array.isArray(old_value) && !old_value.includes(new_value as string | number):
        message = `Error: 属性 "${key}" 的合法值为 [${(old_value as (string | number)[]).join(', ')}]`;
        break;
    }

    if (message) {
      throw new Error(message);
    }
    if (Array.isArray(old_value)) {
      new_value = old_value.sort(i => i === new_value ? -1 : 0);
    }
    option[key] = new_value;

    try {
      await writeSetting(this.bot.uin);
      return `${plugin_name}:\n  ${key}: ${old_value} -> ${new_value}`;
    } catch (error) {
      throw error;
    }
  }

  isApply(): boolean {
    return this.option ? this.option.apply : false;
  }

  getLevel(): UserLevel {
    return this.bot.getUserLevel(this.event);
  }
}
