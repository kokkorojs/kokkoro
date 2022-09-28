import { join } from 'path';
import { deepMerge, logger, YAML } from '@kokkoro/utils';

import { getPluginList, Option } from '../plugin';

// 群聊
export type Group = {
  // 群名称
  name: string;
  // 插件
  plugin: {
    // 插件名
    [name: string]: Option;
  }
}

export type Setting = {
  // 插件列表
  plugins: string[];
  // 群聊列表
  [group_id: number]: Group;
};

/**
 * 获取 setting 路径
 * 
 * @param uin - bot 账号
 * @returns setting 文件路径
 */
function getSettingPath(uin: number): string {
  return join(__workname, 'data/bot', `${uin}/setting.yml`);
}

export async function getSetting(uin: number) {
  const setting: Setting = {
    plugins: [],
  };
  const setting_path = getSettingPath(uin);

  try {
    const local_setting = YAML.readSync(setting_path);
    deepMerge(setting, local_setting);
  } catch (error) {
    const rewrite = !(<Error>error).message.includes('ENOENT: no such file or directory');

    if (rewrite) {
      throw error;
    }
    const plugin_list = await getPluginList();

    // 不存在 setting.yml 就将本地全部模块写入列表
    setting.plugins = [...plugin_list];

    await YAML.write(setting_path, setting)
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
 * 写入 setting 数据
 * 
 * @param {number} uin - bot 账号
 * @returns {Promise}
 */
export async function writeSetting(uin: number, setting: Setting): Promise<boolean> {
  const setting_path = getSettingPath(uin);

  try {
    const local_setting = YAML.readSync(setting_path);

    // 与本地 setting 作对比
    if (JSON.stringify(local_setting) === JSON.stringify(setting)) {
      return false;
    }
    YAML.writeSync(setting_path, setting);
    return true;
  } catch (error) {
    throw error;
  }
}
