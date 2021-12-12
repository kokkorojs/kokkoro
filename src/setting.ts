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

// #dregion 获取当前插件的群聊选项
function getOption(uin: number, group_id: number, plugin_name: string) {
  const setting = all_setting.get(uin) as Setting;

  return setting[group_id].plugin[plugin_name] || {};
}
// #endregion

// #dregion 获取当前插件的群聊选项
async function setOption(uin: number, group_id: number, params: ReturnType<typeof parseCommandline>['params']) {
  const [plugin_name, option_name, value] = params;

  let message;

  switch (true) {
    case !plugin_name:
      message = '插件名不能为空';
      break;
    case !option_name:
      message = '插件选项不能为空';
      break;
    case !value:
      message = '参数不能为空';
      break;
  }

  if (message) {
    return message;
  }

  const option = getOption(uin, group_id, plugin_name);
  const setting = all_setting.get(uin) as Setting;
  const plugin = setting[group_id].plugin;

  if (Object.keys(option).includes(option_name)) {
    switch (true) {
      case ['true', 'false'].includes(value):
        setting[group_id].plugin[plugin_name][option_name] = value === 'true';
        break;

      case !isNaN(value as any):
        setting[group_id].plugin[plugin_name][option_name] = Number(value);
        break;

      default:
        setting[group_id].plugin[plugin_name][option_name] = value;
        break;
    }
    all_setting.set(uin, setting);

    await setSetting(uin);
    return `${plugin_name} {\n  ${option_name}: ${value}\n}`;
  } else {
    return `Error: ${plugin[plugin_name] ? option_name : plugin_name} is not defined`;
  }
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
  getAllSetting, getSetting, handleSetting, getList, getOption, setOption
}