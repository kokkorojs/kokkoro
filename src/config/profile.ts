import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { deepClone, deepMerge } from '@kokkoro/utils';
import { MemberIncreaseEvent, MemberDecreaseEvent } from 'oicq';

import { Bot } from '@/core';
import { Option } from '@/plugin';
import { ProfileDefineEvent } from '@/events';

/** 群设置 */
export interface Setting {
  /** 插件名 */
  [name: string]: Option;
}

/** 群聊 */
export interface Group {
  /** 群名称 */
  name: string;
  /** 插件 */
  setting: Setting;
}

export class Profile {
  private group: {
    [group_id: number]: Group;
  };
  private disable: Set<string>;
  private defaultOption: {
    [key: string]: Option;
  };
  private readonly file: string;

  constructor(
    private bot: Bot,
  ) {
    const file = join(this.bot.dir, `profile-${this.bot.uin}.json`);

    this.file = file;
    this.defaultOption = {};

    try {
      const profile: Profile = this.getLocalData();

      this.group = profile.group;
      this.disable = new Set(profile.disable);
    } catch (error) {
      this.group = {};
      this.disable = new Set();

      const defaultFile = {
        group: {},
        disable: [],
      };

      writeFileSync(file, JSON.stringify(defaultFile, null, 2));
      this.bot.logger.mark(`创建了新的配置文件：${file}`);
    }

    this.initEvents();
  }

  /**
   * 初始化事件
   */
  private initEvents() {
    this.bot.on('bot.profile.define', (event) => this.onDefine(event));
    this.bot.on('bot.profile.refresh', () => this.onRefresh());
    this.bot.on('notice.group.increase', (event) => this.onGroupIncrease(event));
    this.bot.on('notice.group.decrease', (event) => this.onGroupDecrease(event));
  }

  /**
   * 定义插件默认 Option
   * 
   * @param event - Plugin 实例化后触发
   */
  private onDefine(event: ProfileDefineEvent) {
    const { name, option } = event;
    this.defaultOption[name] = option;
  }

  private async onRefresh(): Promise<void> {
    const options = Object.keys(this.defaultOption);
    const options_length = options.length;

    for (let i = 0; i < options_length; i++) {
      const name = options[i];
      const option = this.defaultOption[name];

      for (const [, info] of this.bot.gl) {
        const { group_id, group_name } = info;

        this.group[group_id] ??= {
          name: group_name, setting: {},
        };
        this.group[group_id].name = group_name;
        this.group[group_id].setting[name] = deepMerge(
          deepClone(option),
          this.group[group_id].setting[name],
        );
      }
    }

    try {
      const is_write = await this.write();
      is_write && this.bot.logger.info(`更新了群配置`);
    } catch (error) {
      this.bot.logger.error(`更新群配置失败，${(<Error>error).message}`);
    }
  }

  private async onGroupIncrease(event: MemberIncreaseEvent) {
    if (event.user_id !== this.bot.uin) {
      return;
    }
    const group_id = event.group_id;
    const group_name = event.group.info!.group_name;

    this.group[group_id] ??= {
      name: group_name, setting: {},
    };
    this.group[group_id].name = group_name;

    const settingNames = Object.keys(this.defaultOption);
    const settings_length = settingNames.length;

    for (let i = 0; i < settings_length; i++) {
      const name = settingNames[i];
      const option = this.defaultOption[name];

      this.group[group_id].setting[name] = deepMerge(
        option,
        this.group[group_id].setting[name]
      )
    }

    try {
      const is_write = await this.write();
      is_write && this.bot.logger.info(`更新了群配置，新增了群：${group_id}`);
    } catch (error) {
      this.bot.logger.error(`更新群配置失败，${(<Error>error).message}`);
    }
  }

  private async onGroupDecrease(event: MemberDecreaseEvent) {
    if (event.user_id !== this.bot.uin) {
      return;
    }
    const group_id = event.group_id;

    delete this.group[group_id];

    try {
      const is_write = await this.write();
      is_write && this.bot.logger.info(`更新了群配置，删除了群：${group_id}`);
    } catch (error) {
      this.bot.logger.error(`更新群配置失败，${(<Error>error).message}`);
    }
  }

  // TODO ／人◕ ‿‿ ◕人＼ 使用 proxy 重构
  private async write(): Promise<boolean> {
    const data = {
      group: this.group,
      disable: this.getDisable(),
    };
    // 数据校验，避免重复调用 writeFile
    const localData = this.getLocalData();

    if (JSON.stringify(localData) === JSON.stringify(data)) {
      return false;
    }
    try {
      await writeFile(this.file, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      throw error;
    }
  }

  private getLocalData() {
    return JSON.parse(readFileSync(this.file, 'utf-8'));
  }

  /**
   * 获取群插件设置
   *
   * @param group_id - 群号
   * @returns 群插件设置
   */
  public getSetting(group_id: number): Setting {
    return deepClone(this.group[group_id].setting);
  }

  /**
   * 获取群插件配置项
   *
   * @param group_id - 群号
   * @param name - 插件名
   * @returns 群插件配置项
   */
  getOption(group_id: number, name: string): Option {
    return deepClone(this.group[group_id].setting[name]);
  }

  /**
   * 获取插件禁用列表
   *
   * @returns
   */
  public getDisable(): string[] {
    return [...this.disable];
  }

  public async enablePlugin(name: string): Promise<void> {
    let error;

    if (!this.defaultOption[name]) {
      error = `插件 ${name} 未挂载`;
    } else if (!this.disable.has(name)) {
      error = `插件 ${name} 不在禁用列表`;
    } else {
      this.disable.delete(name);

      try {
        await this.write();
        this.bot.logger.info(`更新了禁用列表，移除了插件：${name}`);
      } catch (err) {
        error = `更新禁用列表失败，${(<Error>err).message}`;
        this.disable.add(name);
      }
    }
    if (error) {
      this.bot.logger.error(error);
      throw new Error(error);
    }
  }

  public async disablePlugin(name: string): Promise<void> {
    let error;

    if (!this.defaultOption[name]) {
      error = `插件 ${name} 未挂载`;
    } else if (this.disable.has(name)) {
      error = `插件 ${name} 已在禁用列表`;
    } else {
      this.disable.add(name);

      try {
        await this.write();
        this.bot.logger.info(`更新了禁用列表，新增了插件：${name}`);
      } catch (err) {
        error = `更新禁用列表失败，${(<Error>err).message}`;
        this.disable.delete(name);
      }
    }
    if (error) {
      this.bot.logger.error(error);
      throw new Error(error);
    }
  }

  async updateOption(group_id: number, plugin: string, key: string, value: string | number | boolean) {
    const option = this.group[group_id].setting[plugin];
    const old_value = option[key];

    let message: string = '';
    let new_value: string | number | boolean | Array<string | number>;

    // 数据类型转换
    switch (true) {
      case ['true', 'false'].includes(value as string):
        new_value = value === 'true';
        break;
      case /^(-?[1-9]\d*|0)$/.test(value as string):
        new_value = +value;
        break;
      default:
        new_value = value;
        break;
    }

    // 配置项类型校验
    switch (true) {
      case old_value === new_value:
        message = `Error: "${key}" 当前值相等`;
        break;
      case !Array.isArray(old_value) && typeof old_value !== typeof new_value:
        message = old_value
          ? `Error: ${plugin}[${key}] 应为 ${typeof option[key]} 类型`
          : `Error: ${key} is not defined`;
        break;
      case Array.isArray(old_value) && !old_value.includes(new_value as string | number):
        message = `Error: 属性 ${key} 的合法值为 [${(option[key] as (string | number)[]).join(', ')}]`;
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
      return this.write();
    } catch (error) {
      option[key] = old_value;
      throw error;
    }
  }
}
