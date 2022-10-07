import { join } from 'path';
import { Client } from 'oicq';
import { writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';

import { Option } from '@/plugin';
import { Bot, data_dir } from '@/core/bot';

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
  logger: Client['logger'];
  setting_dir: string;
  group: {
    [group_id: number]: Group;
  };
  plugins: string[];

  constructor(uin: number, logger: Client['logger']) {
    let generate: boolean;
    let group: this['group'] | undefined;
    let plugins: this['plugins'] | undefined;

    this.logger = logger;
    this.setting_dir = join(data_dir, uin.toString(), `setting-${uin}.json`);

    try {
      const setting: Setting = require(this.setting_dir);

      group = setting.group;
      plugins = setting.plugins;
      generate = false;
    } catch (error) {
      generate = true;
      writeFileSync(this.setting_dir, '{}');
    }

    this.group = group ?? {};
    this.plugins = plugins ?? [];

    generate && this.logger.mark("创建了新的配置文件：" + this.setting_dir);
  }

  private write() {
    const data = {
      group: this.group,
      plugins: this.plugins,
    };

    return writeFile(this.setting_dir, JSON.stringify(data, null, 2));
  }

  public async refresh(bot: Bot) {
    const group: this['group'] = {};

    for (const [, info] of bot.gl) {
      const { group_id, group_name } = info;

      group[group_id] = {
        name: group_name, plugin: {},
      };
    }

    if (JSON.stringify(group) !== JSON.stringify(this.group)) {
      this.group = group;

      try {
        await this.write();
        this.logger.info('更新了配置文件');
      } catch (error) {
        this.logger.info(`更新配置文件失败，${(error as Error).message}`);
      }
    }
  }
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
