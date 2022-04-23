import YAML from 'yaml';
import { join } from 'path';
import { writeFile, readFile } from 'fs/promises';

import { bot_dir } from '.';
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
export async function initSetting(uin: number): Promise<Setting> {
  const setting: Setting = { plugins: [] };
  const setting_path = getSettingPath(uin);

  setting_list.set(uin, setting);
  try {
    const base_setting = await readFile(setting_path, 'utf8');
    const local_setting = YAML.parse(base_setting);
    deepMerge(setting, local_setting);
  } catch (error) {
    const rewrite = !(<Error>error).message.includes('ENOENT: no such file or directory');

    if (rewrite) {
      throw error;
    }
    const plugin_list = getPluginList();
    const plugin_keys = plugin_list.keys();

    // 不存在 setting.yml 就将本地全部模块写入列表
    setting.plugins = [...plugin_keys];

    await writeFile(setting_path, YAML.stringify(setting))
      .then(() => {
        logger.mark(`创建了新的设置文件: data/bot/${uin}/setting.yml`);
      })
      .catch((error: Error) => {
        logger.error(`Error: ${error.message}`);
        throw error;
      })
  }
  return setting;
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
export function getSetting(uin: number): Setting {
  if (!setting_list.has(uin)) {
    throw new Error(`setting "${uin}" is undefined`);
  }
  return setting_list.get(uin)!;
}

/**
 * 写入 setting 数据
 * 
 * @param {number} uin - bot 账号
 * @returns {Promise}
 */
export async function writeSetting(uin: number): Promise<boolean> {
  const setting_path = getSettingPath(uin);

  try {
    const setting = getSetting(uin);
    const base_setting = await readFile(setting_path, 'utf8');
    const local_setting: Setting = YAML.parse(base_setting);

    // 与本地 setting 作对比
    if (JSON.stringify(local_setting) === JSON.stringify(setting)) {
      return false;
    }
    await writeFile(setting_path, YAML.stringify(setting));
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * 获取 setting 路径
 * 
 * @param {number} uin - bot 账号
 * @returns {string} setting 文件路径
 */
function getSettingPath(uin: number): string {
  return join(bot_dir, `${uin}/setting.yml`);
}
