import { resolve } from 'path';
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { GroupMessageEvent } from 'oicq';

import { getStack } from './util';
import { parseCommand } from './command';
import { getGlobalConfig } from './config';
import { GlobalConfig, Setting } from '..';

const all_setting: Map<number, Setting> = new Map();

(async () => {
  try {
    const global_config: GlobalConfig = getGlobalConfig();
    const uins: string[] = Object.keys(global_config.bots);

    for (const uin of uins) {
      const setting_path = resolve(__workname, `data/bots/${uin}/setting.json`);

      if (existsSync(setting_path)) {
        all_setting.set(Number(uin), require(setting_path));
      } else {
        const setting = {
          all_plugin: [],
        }

        all_setting.set(Number(uin), setting);
        await writeFile(setting_path, `${JSON.stringify(setting, null, 2)}`);
      }
    }
  } catch { }
})();

//#region 获取所有群聊插件设置
function getAllSetting() {
  return all_setting
}
//#endregion

//#region 获取当前群聊插件设置
function getSetting(uin: number) {
  return all_setting.get(uin)
}

//#region 写入群聊插件设置
function setSetting(uin: number) {
  const setting_path = resolve(__workname, `data/bots/${uin}/setting.json`);
  const setting = all_setting.get(uin);

  return writeFile(setting_path, `${JSON.stringify(setting, null, 2)}`);
}
//#endregion

//#region 获取当前插件的群聊选项
function getOption(event: GroupMessageEvent) {
  const { self_id, group_id } = event;

  const stack = getStack();
  const regex = /\w+(?=\\index\.js)/g;
  const setting = all_setting.get(self_id) as Setting;
  const fileName = stack[2].getFileName() as string;
  const [plugin_name] = fileName.match(regex) as string[];

  return setting[group_id].plugin[plugin_name] || {};
}
//#endregion

// #dregion 获取当前插件的群聊选项
async function setOption(params: ReturnType<typeof parseCommand>['params'], event: GroupMessageEvent) {
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

  const { self_id, group_id } = event;

  const setting = all_setting.get(self_id) as Setting;
  const option = setting[group_id].plugin[plugin_name] || {};
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
    all_setting.set(self_id, setting);

    await setSetting(self_id);
    return `${plugin_name} {\n  ${option_name}: ${value}\n}`;
  } else {
    return `Error: ${plugin[plugin_name] ? option_name : plugin_name} is not defined`;
  }
}
// #endregion

//#region 获取群聊插件列表
async function getList(event: GroupMessageEvent): Promise<string> {
  const { self_id, group_id } = event;
  const { plugin } = all_setting.get(self_id)?.[group_id] || { plugin: {} };
  const message = ['// 如要查看更多信息可输入 >setting\n"list": {'];

  for (const key in plugin) message.push(`  "${key}": ${plugin[key].switch}`);

  message.push('}');
  return message.join('\n');
}
//#endregion

async function settingHanders(params: ReturnType<typeof parseCommand>['params'], event: GroupMessageEvent): Promise<string> {
  const { group_id, self_id } = event;
  let message: string;

  switch (true) {
    case !params.length:
      const setting = `"${group_id}": ${JSON.stringify(all_setting.get(self_id)?.[group_id] || {}, null, 2)}`;

      message = setting;
      break;

    default:
      message = `Error: 未知参数：${params[0]}`;
      break;
  }

  return message;
}
export {
  getSetting, getAllSetting, getList, getOption, setOption, settingHanders,
}