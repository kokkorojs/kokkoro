import { resolve } from 'path';
import { stringify, parse } from 'yaml';
import { writeFile, readFile } from 'fs/promises';

import { deepMerge, logger } from './util';
import { getPluginList, Option } from './plugin';

// 群聊
export interface Group {
  // 群名称
  name: string;
  // 插件
  plugin: {
    // 插件名
    [name: string]: Option;
  }
}

export interface Setting {
  // 插件列表
  plugins: string[];
  // 群聊列表
  [group_id: number]: Group
}

const setting_list: Map<number, Setting> = new Map();

/**
 * 初始化 setting 数据
 *
 * @param {number} uin 机器人账号
 */
export function initSetting(uin: number): Promise<Setting> {
  const setting: Setting = { plugins: [] };
  const setting_path = resolve(__workname, `data/bot/${uin}/setting.yml`);

  setting_list.set(uin, setting);
  return new Promise((resolve, reject) => {
    readFile(setting_path, 'utf8')
      .then(base_setting => {
        const local_setting = parse(base_setting);

        deepMerge(setting, local_setting);
      })
      .catch(async (error: Error) => {
        const rewrite = !error.message.includes('ENOENT: no such file or directory');

        if (rewrite) {
          reject(error);
        }
        const plugin_list = getPluginList();
        const plugin_keys = plugin_list.keys();

        // 不存在 setting.yml 就将本地全部模块写入列表
        setting.plugins = [...plugin_keys];

        await writeFile(setting_path, stringify(setting))
          .then(() => {
            logger.mark(`创建了新的设置文件: data/bot/${uin}/setting.yml`);
          })
          .catch((error: Error) => {
            logger.error(`Error: ${error.message}`);
            reject(error);
          })
      })
      .finally(() => {
        resolve(setting);
      })
  })
}

/**
 * 获取所有群聊插件设置
 *
 * @returns {Map} setting 集合
 */
export function getSettingList(): Map<number, Setting> {
  return setting_list;
}

/**
 * 获取当前群聊插件设置
 *
 * @param {number} uin - bot 账号
 * @returns {Setting} setting 对象
 */
export async function getSetting(uin: number): Promise<Setting> {
  if (!setting_list.has(uin)) {
    throw new Error(`setting "${uin}" is undefined`);
  }
  return setting_list.get(uin)!;
}

export function writeSetting(uin: number): Promise<boolean> {
  const setting_path = resolve(__workname, `data/bot/${uin}/setting.yml`);

  return new Promise((resolve, reject) => {
    Promise.all([getSetting(uin), readFile(setting_path, 'utf8')])
      .then(async values => {
        const [setting, base_setting] = values;
        const local_setting: Setting = parse(base_setting);

        // 与本地 setting 作对比
        if (JSON.stringify(local_setting) !== JSON.stringify(setting)) {
          await writeFile(setting_path, stringify(setting));
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .catch(error => {
        reject(error);
      })
  })
}
