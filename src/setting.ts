import { resolve } from 'path'
import { writeFile } from 'fs/promises';

import { GlobalConfig, Setting } from '..';
import { getGlobalConfig, parseCommandline } from './config';

const all_setting: Map<number, Setting> = new Map();

try {
  const global_config: GlobalConfig = getGlobalConfig();
  const uins: string[] = Object.keys(global_config.bots);

  for (const uin of uins) {
    const setting_path = resolve(__workname, `data/bots/${uin}/setting.json`);

    all_setting.set(Number(uin), require(setting_path))
  }
} catch { }

// #dregion 列出所有群聊插件设置
function getAllSetting() {
  return all_setting
}
// #endregion

// #dregion 列出所有群聊插件设置
function getSetting(uin: number) {
  return all_setting.get(uin)
}
// #endregion

// #dregion 写入群聊插件设置
function setSetting(uin: number) {
  const setting_path = resolve(__workname, `data/bots/${uin}/setting.json`);
  const setting = all_setting.get(uin);

  return writeFile(setting_path, `${JSON.stringify(setting, null, 2)}`);
}
// #endregion

//#dregion handleSetting
async function handleSetting(params: ReturnType<typeof parseCommandline>['params'], self_id: number, group_id: number): Promise<string> {
  if (!params[0]) return `"${group_id}": ${JSON.stringify(all_setting.get(self_id)?.[group_id] || {}, null, 2)}`

  return 'handleSetting'
}
//#endregion

// #dregion 获取群聊插件列表
async function getList(self_id: number, group_id: number): Promise<string> {
  const { plugin } = all_setting.get(self_id)?.[group_id] || { plugin: {} };
  const message = ['// 如要查看更多信息可输入 >setting\n"list": {'];

  for (const key in plugin) message.push(`  "${key}": ${plugin[key].switch}`);

  message.push('}');
  return message.join('\n');
}
// #endregion

export {
  getAllSetting, getSetting, handleSetting, getList
}