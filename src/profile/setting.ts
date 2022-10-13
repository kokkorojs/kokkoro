import { join } from 'path';
import { writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { MemberDecreaseEvent, MemberIncreaseEvent } from 'oicq';

import { Option } from '@/plugin';
import { Bot, data_dir } from '@/core';
import { BindSettingEvent } from '@/worker';
import { debounce, deepClone, deepMerge } from '@/utils';

/** 群聊 */
export type Group = {
  /** 群名称 */
  name: string;
  /** 插件 */
  plugin: {
    /** 插件名 */
    [name: string]: Option;
  }
}

export class Setting {
  plugins: string[];
  setting_dir: string;
  group: {
    [group_id: number]: Group;
  };
  defaultOption: {
    [key: string]: Option;
  };

  constructor(
    private bot: Bot,
  ) {
    const fullpath = join(data_dir, this.bot.uin.toString());
    const filename = `setting-${this.bot.uin}.json`;

    this.defaultOption = {};
    this.setting_dir = join(fullpath, filename);

    try {
      const setting: Setting = require(this.setting_dir);

      this.group = setting.group;
      this.plugins = setting.plugins;
    } catch (error) {
      this.group = {};
      this.plugins = [];

      writeFileSync(this.setting_dir, '{}');
      this.bot.logger.mark("创建了新的配置文件：" + this.setting_dir);
    }
    this.bindEvents();
  }

  /**
   * 绑定事件监听
   */
  private bindEvents(): void {
    this.bot.on('bind.setting', event => this.onBindSetting(event));
    this.bot.on('notice.group.increase', event => this.onGroupIncrease(event));
    this.bot.on('notice.group.decrease', event => this.onGroupDecrease(event));
  }

  // TODO ⎛⎝≥⏝⏝≤⎛⎝ 使用 proxy 重构
  private async write() {
    const data = {
      group: this.group,
      plugins: this.plugins,
    };

    // TODO ⎛⎝≥⏝⏝≤⎛⎝ 数据校验，避免重复调用 writeFile
    // const localData = require(this.setting_dir);

    return writeFile(this.setting_dir, JSON.stringify(data, null, 2));
  }

  private onBindSetting(event: BindSettingEvent) {
    const { name, option } = event;

    // 内置插件不用初始化配置
    if (name === 'kokkoro') {
      return;
    }
    this.defaultOption[name] = option;
    this.refresh(name, option);
  }

  private onGroupIncrease(event: MemberIncreaseEvent): void {
    if (event.user_id !== this.bot.uin) {
      return;
    }
    const group_id = event.group_id;
    const group_name = event.group.info!.group_name;
    // const group_name = (await this.getGroupInfo(group_id)).group_name;

    this.group[group_id] ??= {
      name: group_name, plugin: {},
    };
    this.group[group_id].name = group_name;

    const optionNames = Object.keys(this.defaultOption);
    const options_length = optionNames.length;

    for (let i = 0; i < options_length; i++) {
      const name: string = optionNames[i];
      const option: Option = this.getOption(name);

      this.group[group_id].plugin[name] = deepMerge(
        option,
        this.group[group_id].plugin[name]
      )
    }

    this.write()
      .then(() => {
        this.bot.logger.info(`更新了群配置，新增了群：${group_id}`);
      })
      .catch((error) => {
        this.bot.logger.error(`更新群配置失败，${error.message}`);
      })
  }

  private onGroupDecrease(event: MemberDecreaseEvent): void {
    if (event.user_id !== this.bot.uin) {
      return;
    }
    const group_id = event.group_id;

    delete this.group[group_id];
    this.write()
      .then(() => {
        this.bot.logger.info(`更新了群配置，删除了群：${group_id}`);
      })
      .catch((error) => {
        this.bot.logger.error(`更新群配置失败，${error.message}`);
      })
  }

  private refresh = debounce(async (name: string, option: Option) => {
    for (const [, info] of this.bot.gl) {
      const { group_id, group_name } = info;

      this.group[group_id] ??= {
        name: group_name, plugin: {},
      };
      this.group[group_id].name = group_name;
      // 刷新指定插件配置项
      this.group[group_id].plugin[name] = deepMerge(
        deepClone(option),
        this.group[group_id].plugin[name]
      )
    }

    try {
      await this.write();
      this.bot.logger.info(`更新了群配置`);
    } catch (error) {
      if (error instanceof Error) {
        this.bot.logger.error(`更新群配置失败，${(error).message}`);
      }
    }
  }, 10)

  private getOption(name: string): Option {
    return deepClone(this.defaultOption[name]);
  }
}
