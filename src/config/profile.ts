// import { join } from 'path';
// import { EventEmitter } from 'events';
// import { writeFileSync } from 'fs';
// import { writeFile } from 'fs/promises';
// import { MemberDecreaseEvent, MemberIncreaseEvent, event } from 'amesu';

// import { Bot } from '@/core';
// import { Option } from '@/plugin';
// import { deepClone, deepMerge } from '@/utils';

// /** 群聊 */
// export type Group = {
//   /** 群名称 */
//   name: string;
//   /** 插件 */
//   setting: Setting;
// }

// /** 群设置 */
// export type Setting = {
//   /** 插件名 */
//   [name: string]: Option;
// }

// export class Profile extends EventEmitter {
//   disable: Set<string>;
//   group: {
//     [group_id: number]: Group;
//   };
//   defaultOption: {
//     [key: string]: Option;
//   };
//   readonly file: string;

//   constructor(
//     private bot: Bot,
//   ) {
//     super();

//     const dir = join(this.bot.dir, `profile-${this.bot.uin}.json`);
//     const file = join(__workname, dir);

//     this.file = file;
//     this.defaultOption = {};

//     try {
//       const profile: Profile = require(file);

//       this.group = profile.group;
//       this.disable = new Set(profile.disable);
//     } catch (error) {
//       this.group = {};
//       this.disable = new Set();

//       const defaultFile = {
//         group: {},
//         disable: [],
//       };

//       writeFileSync(file, JSON.stringify(defaultFile, null, 2));
//       this.bot.logger.mark("创建了新的配置文件：" + dir);
//     }
//     this.initEmitter();
//     this.initSubscribe();
//   }

//   /**
//    * 初始化事件触发器
//    */
//   private initEmitter() {
//     this
//       .on('profile.option.init', (event) => {
//         const { plugin_name, option } = event;
//         this.defaultOption[plugin_name] = option;
//       })
//       .on('profile.refresh', () => {
//         this.onRefresh();
//       })
//   }

//   /**
//    * 初始化事件订阅
//    */
//   private initSubscribe(): void {
//     this.bot
//       .pipe(
//         event('notice.group.increase')
//       )
//       .subscribe(event => this.onGroupIncrease(event))
//     this.bot
//       .pipe(
//         event('notice.group.decrease')
//       )
//       .subscribe(event => this.onGroupDecrease(event))
//   }

//   // TODO ⎛⎝≥⏝⏝≤⎛⎝ 使用 proxy 重构
//   async write() {
//     const data = {
//       group: this.group,
//       disable: [...this.disable],
//     };

//     // TODO ⎛⎝≥⏝⏝≤⎛⎝ 数据校验，避免重复调用 writeFile
//     // const localData = require(this.setting_dir);

//     return writeFile(this.file, JSON.stringify(data, null, 2));
//   }

//   private async onRefresh(): Promise<void> {
//     const options = Object.keys(this.defaultOption);
//     const options_length = options.length;

//     for (let i = 0; i < options_length; i++) {
//       const name = options[i];
//       const option = this.getDefaultOption(name);

//       for (const [, info] of this.bot.gl) {
//         const { group_id, group_name } = info;

//         this.group[group_id] ??= {
//           name: group_name, setting: {},
//         };
//         this.group[group_id].name = group_name;
//         this.group[group_id].setting[name] = deepMerge(
//           deepClone(option),
//           this.group[group_id].setting[name],
//         );
//       }
//     }

//     try {
//       await this.write();
//       this.bot.logger.info(`更新了群配置`);
//     } catch (error) {
//       this.bot.logger.error(`更新群配置失败，${(<Error>error).message}`);
//     }
//   }

//   private onGroupIncrease(event: MemberIncreaseEvent): void {
//     if (event.user_id !== this.bot.uin) {
//       return;
//     }
//     const group_id = event.group_id;
//     const group_name = event.group.info!.group_name;

//     this.group[group_id] ??= {
//       name: group_name, setting: {},
//     };
//     this.group[group_id].name = group_name;

//     const settingNames = Object.keys(this.defaultOption);
//     const settings_length = settingNames.length;

//     for (let i = 0; i < settings_length; i++) {
//       const name = settingNames[i];
//       const option = this.defaultOption[name];

//       this.group[group_id].setting[name] = deepMerge(
//         option,
//         this.group[group_id].setting[name]
//       )
//     }

//     this.write()
//       .then(() => {
//         this.bot.logger.info(`更新了群配置，新增了群：${group_id}`);
//       })
//       .catch((error) => {
//         this.bot.logger.error(`更新群配置失败，${error.message}`);
//       })
//   }

//   private onGroupDecrease(event: MemberDecreaseEvent): void {
//     if (event.user_id !== this.bot.uin) {
//       return;
//     }
//     const group_id = event.group_id;

//     delete this.group[group_id];
//     this.write()
//       .then(() => {
//         this.bot.logger.info(`更新了群配置，删除了群：${group_id}`);
//       })
//       .catch((error) => {
//         this.bot.logger.error(`更新群配置失败，${error.message}`);
//       })
//   }

//   getDefaultOption(name: string): Option {
//     return deepClone(this.defaultOption[name]);
//   }
// }



import { join } from 'path';
import { writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { MemberIncreaseEvent, MemberDecreaseEvent } from 'oicq';

import { Bot } from '@/core';
// import { BotEvent } from './events';
import { deepClone, deepMerge } from '@/utils';
import { ProfileDefineEvent } from '@/events';
import { Option } from '@/plugin';

/** 插件配置 */
// export type Option = {
//   /** 锁定，默认 false */
//   lock: boolean;
//   /** 开关，默认 true */
//   apply: boolean;
//   /** 其它设置 */
//   [param: string]: string | number | boolean | Array<string | number>;
// }

/** 群设置 */
export type Setting = {
  /** 插件名 */
  [name: string]: Option;
}

/** 群聊 */
export type Group = {
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
      await this.write();
      this.bot.logger.info(`更新了群配置`);
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
      await this.write();
      this.bot.logger.info(`更新了群配置，新增了群：${group_id}`);
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
      await this.write();
      this.bot.logger.info(`更新了群配置，删除了群：${group_id}`);

    } catch (error) {
      this.bot.logger.error(`更新群配置失败，${(<Error>error).message}`);
    }
  }

  // TODO ⎛⎝≥⏝⏝≤⎛⎝ 使用 proxy 重构
  private async write() {
    const data = {
      group: this.group,
      disable: [...this.disable],
    };

    // TODO ⎛⎝≥⏝⏝≤⎛⎝ 数据校验，避免重复调用 writeFile
    // const localData = require(this.setting_dir);

    return writeFile(this.file, JSON.stringify(data, null, 2));
  }

  /**
   * 获取群插件设置
   * 
   * @param group_id - 群号
   * @returns 群插件设置
   */
  getSetting(group_id: number): Setting {
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
  getDisable(): string[] {
    return [...this.disable];
  }
}
