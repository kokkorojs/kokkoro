import { join } from 'path';
import { writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { deepClone, deepAssign, decache } from '@kokkoro/utils';
import { MemberIncreaseEvent, MemberDecreaseEvent } from 'oicq';

import { Bot } from '@/core';
import { Option } from '@/plugin';

/** 群设置 */
export interface Setting {
  /** 插件名 */
  [name: string]: Option;
}

export class Profile {
  /** 文件路径 */
  private readonly file: string;
  /** 插件默认配置项 */
  private defaultSetting: Setting;

  /** 群列表 */
  public group: {
    [group_id: number]: {
      /** 群名称 */
      name: string;
      /** 插件 */
      setting: Setting;
    };
  };
  /** 禁用列表 */
  public disable: Set<string>;

  constructor(
    private bot: Bot,
  ) {
    const file = join(this.bot.dir, `profile-${this.bot.uin}.json`);

    this.file = file;
    this.defaultSetting = {};

    try {
      const profile = this.getLocalData();

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
      this.bot.logger.info(`创建了新的配置文件：${file}`);
    }

    this.initEvents();
  }

  /**
   * 初始化事件
   */
  private initEvents() {
    this.bot.on('notice.group.increase', (event) => this.onGroupIncrease(event));
    this.bot.on('notice.group.decrease', (event) => this.onGroupDecrease(event));
  }

  /**
   * 定义插件默认 Option
   * @param name - 插件名
   * @param option - 配置项
   */
  public defineOption(name: string, option: Option) {
    this.defaultSetting[name] = option;
  }

  public async refreshData(): Promise<void> {
    const options = Object.keys(this.defaultSetting);
    const options_length = options.length;

    for (let i = 0; i < options_length; i++) {
      const name = options[i];
      const option = this.defaultSetting[name];

      for (const [, info] of this.bot.gl) {
        const { group_id, group_name } = info;

        this.group[group_id] ??= {
          name: group_name, setting: {},
        };
        this.group[group_id].name = group_name;
        this.group[group_id].setting[name] = deepAssign(
          deepClone(option),
          this.group[group_id].setting[name],
        ) as Option;
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

    const settingNames = Object.keys(this.defaultSetting);
    const settings_length = settingNames.length;

    for (let i = 0; i < settings_length; i++) {
      const name = settingNames[i];
      const option = this.defaultSetting[name];

      this.group[group_id].setting[name] = deepAssign(
        option,
        this.group[group_id].setting[name]
      ) as Option;
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
      disable: [...this.disable],
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

  private getLocalData(): Profile {
    decache(this.file);
    return deepClone(require(this.file));
  }

  /**
   * 获取群插件设置。
   * 
   * @param group_id - 群号
   * @returns 群插件设置
   */
  public getSetting(group_id: number): Setting {
    return deepClone(this.group[group_id].setting);
  }

  /**
   * 获取群插件配置项。
   * 
   * @param group_id - 群号
   * @param name - 插件名
   * @returns 群插件配置项
   */
  public getOption(group_id: number, name: string): Option {
    return deepClone(this.group[group_id].setting[name]);
  }

  /**
   * 获取 bot 禁用的插件。
   * 
   * @returns 插件禁用列表
   */
  public getDisablePlugins(): string[] {
    return [...this.disable];
  }

  /**
   * 修改插件配置项
   * 
   * @param group_id - 群号
   * @param plugin - 插件名
   * @param key - 配置项 key
   * @param value - 配置项 value
   * @returns 是否修改成功
   */
  public updateOption(group_id: number, plugin: string, key: string, value: any): Promise<boolean> {
    const option = this.group[group_id].setting[plugin];
    const old_value = option[key];
    // 数据类型转换
    const new_value = JSON.parse(value);

    let message: string = '';

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
    }

    if (message) {
      throw new Error(message);
    }
    option[key] = new_value;

    try {
      return this.write();
    } catch (error) {
      option[key] = old_value;
      throw error;
    }
  }

  public async enablePlugin(name: string): Promise<void> {
    let message;

    if (!this.defaultSetting[name]) {
      message = `插件 ${name} 未挂载`;
    } else if (!this.disable.has(name)) {
      message = `插件 ${name} 不在禁用列表`;
    } else {
      this.disable.delete(name);

      try {
        await this.write();
        this.bot.logger.info(`更新了禁用列表，移除了插件：${name}`);
      } catch (error) {
        message = `更新禁用列表失败，${(<Error>error).message}`;
        this.disable.add(name);
      }
    }
    if (message) {
      this.bot.logger.error(message);
      throw new Error(message);
    }
  }

  public async disablePlugin(name: string): Promise<void> {
    let error;

    if (!this.defaultSetting[name]) {
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
}
