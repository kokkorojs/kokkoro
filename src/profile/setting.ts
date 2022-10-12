import { join } from 'path';
import { Client, MemberDecreaseEvent, MemberIncreaseEvent } from 'oicq';
import { writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';

import { Bot, data_dir } from '@/core';
import { Option } from '@/plugin';
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
  setting_dir: string;
  group: {
    [group_id: number]: Group;
  };
  plugins: string[];

  constructor(
    private bot: Bot,
  ) {
    const fullpath = join(data_dir, this.bot.uin.toString());
    this.setting_dir = join(fullpath, `setting-${this.bot.uin}.json`);

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

    this.bot
      .on('bind.setting', (event) => {
        const { name, option } = event;

        // 内置插件不用初始化配置
        if (name === 'kokkoro') {
          return;
        }

        for (const [, info] of this.bot.gl) {
          const { group_id, group_name } = info;

          this.group[group_id] ??= {
            name: group_name, plugin: {},
          };
          this.group[group_id].name = group_name;
          this.group[group_id].plugin[name] = deepMerge(
            deepClone(option),
            this.group[group_id].plugin[name]
          )
        }
        this.write();
      })
      .on('notice.group.increase', this.onGroupIncrease)
      .on('notice.group.decrease', this.onGroupDecrease)
  }

  // TODO ⎛⎝≥⏝⏝≤⎛⎝ 使用 proxy 重构
  private write = debounce(async () => {
    const data = {
      group: this.group,
      plugins: this.plugins,
    };

    // TODO ⎛⎝≥⏝⏝≤⎛⎝ 数据校验，避免重复调用 writeFile
    // const localData = require(this.setting_dir);

    try {
      await writeFile(this.setting_dir, JSON.stringify(data, null, 2));
      this.bot.logger.info('更新了配置文件');
    } catch (error) {
      this.bot.logger.info(`更新配置文件失败，${(<Error>error).message}`);
    }
  }, 10);

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

    // for (const name of this.setting.plugins) {

    //   // const plugin = await getPlugin(name);
    //   // const default_option = plugin.getOption();
    //   // const local_option = setting[group_id].plugin[name];
    //   // const option = deepMerge(default_option, local_option);

    //   this.setting.group[group_id].plugin[name] = option;
    // }
    this.write()
      .then(() => {
        this.bot.logger.info(`更新了群配置，新增了群：${group_id}`);
      })
      .catch((error) => {
        this.bot.logger.error(`群配置失败，${error.message}`);
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
        this.bot.logger.error(`群配置失败，${error.message}`);
      })
  }

  // public async refresh(bot: Bot) {
  //   const group: this['group'] = {};

  //   for (const [, info] of bot.gl) {
  //     const { group_id, group_name } = info;

  //     group[group_id] = {
  //       name: group_name, plugin: {},
  //     };
  //   }

  //   if (JSON.stringify(group) !== JSON.stringify(this.group)) {
  //     this.group = group;
  //   }
  // }
}

// export type Setting = {
//   // 插件列表
//   plugins: string[];
//   // 群聊列表
//   [group_id: number]: Group;
// };

// /**
//  * 获取 setting 路径
//  *
//  * @param uin - bot 账号
//  * @returns setting 文件路径
//  */
// function getSettingPath(uin: number): string {
//   return join(__workname, 'data/bot', `${uin}/setting.yml`);
// }

// export async function getSetting(uin: number) {
//   const setting: Setting = {
//     plugins: [],
//   };
//   const setting_path = getSettingPath(uin);

//   try {
//     const local_setting = YAML.readSync(setting_path);
//     deepMerge(setting, local_setting);
//   } catch (error) {
//     const rewrite = !(<Error>error).message.includes('ENOENT: no such file or directory');

//     if (rewrite) {
//       throw error;
//     }
//     const plugin_list = await getPluginList();

//     // 不存在 setting.yml 就将本地全部模块写入列表
//     setting.plugins = [...plugin_list];

//     await YAML.write(setting_path, setting)
//       .then(() => {
//         logger.mark(`创建了新的设置文件: data/bot/${uin}/setting.yml`);
//       })
//       .catch((error: Error) => {
//         logger.error(`Error: ${error.message}`);
//         throw error;
//       })
//   }
//   return setting;
// }

// /**
//  * 写入 setting 数据
//  *
//  * @param {number} uin - bot 账号
//  * @returns {Promise}
//  */
// export async function writeSetting(uin: number, setting: Setting): Promise<boolean> {
//   const setting_path = getSettingPath(uin);

//   try {
//     const local_setting = YAML.readSync(setting_path);

//     // 与本地 setting 作对比
//     if (JSON.stringify(local_setting) === JSON.stringify(setting)) {
//       return false;
//     }
//     YAML.writeSync(setting_path, setting);
//     return true;
//   } catch (error) {
//     throw error;
//   }
// }
