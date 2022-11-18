import { join } from 'path';
import { EventEmitter } from 'events';
import { writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { MemberDecreaseEvent, MemberIncreaseEvent, event } from 'amesu';

import { Bot } from '@/core';
import { Option } from '@/plugin';
import { deepClone, deepMerge } from '@/utils';

/** 群聊 */
export type Group = {
  /** 群名称 */
  name: string;
  /** 插件 */
  setting: Setting;
}

/** 群设置 */
export type Setting = {
  /** 插件名 */
  [name: string]: Option;
}

export class Profile extends EventEmitter {
  disable: Set<string>;
  group: {
    [group_id: number]: Group;
  };
  defaultOption: {
    [key: string]: Option;
  };
  readonly file: string;

  constructor(
    private bot: Bot,
  ) {
    super();

    const dir = join(this.bot.dir, `profile-${this.bot.uin}.json`);
    const file = join(__workname, dir);

    this.file = file;
    this.defaultOption = {};

    try {
      const profile: Profile = require(file);

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
      this.bot.logger.mark("创建了新的配置文件：" + dir);
    }
    this.initEmitter();
    this.initSubscribe();
  }

  /**
   * 初始化事件触发器
   */
  private initEmitter() {
    this
      .on('profile.option.init', (event) => {
        const { plugin_name, option } = event;
        this.defaultOption[plugin_name] = option;
      })
      .on('profile.refresh', () => {
        this.onRefresh();
      })
  }

  /**
   * 初始化事件订阅
   */
  private initSubscribe(): void {
    this.bot
      .pipe(
        event('notice.group.increase')
      )
      .subscribe(event => this.onGroupIncrease(event))
    this.bot
      .pipe(
        event('notice.group.decrease')
      )
      .subscribe(event => this.onGroupDecrease(event))
  }

  // TODO ⎛⎝≥⏝⏝≤⎛⎝ 使用 proxy 重构
  async write() {
    const data = {
      group: this.group,
      disable: [...this.disable],
    };

    // TODO ⎛⎝≥⏝⏝≤⎛⎝ 数据校验，避免重复调用 writeFile
    // const localData = require(this.setting_dir);

    return writeFile(this.file, JSON.stringify(data, null, 2));
  }

  private async onRefresh(): Promise<void> {
    const options = Object.keys(this.defaultOption);
    const options_length = options.length;

    for (let i = 0; i < options_length; i++) {
      const name = options[i];
      const option = this.getDefaultOption(name);

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
      await this.write();
      this.bot.logger.info(`更新了群配置`);
    } catch (error) {
      this.bot.logger.error(`更新群配置失败，${(<Error>error).message}`);
    }
  }

  private onGroupIncrease(event: MemberIncreaseEvent): void {
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

  getDefaultOption(name: string): Option {
    return deepClone(this.defaultOption[name]);
  }
}
