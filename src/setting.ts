import { resolve } from 'path';
import { existsSync } from 'fs';
import { stringify, parse } from 'yaml';
import { writeFile, readFile } from 'fs/promises';
import { GroupMessageEvent } from 'oicq';

import { getStack, logger } from './util';
import { parseCommand } from './command';
import { KokkoroConfig, getConfig } from './config';

// 群聊
interface Group {
  // 群名称
  name: string;
  // 插件
  plugin: {
    // 插件名
    [plugin_name: string]: Option;
  }
}

// 插件选项
export interface Option {
  // 插件锁定
  lock: boolean;
  // 插件开关
  apply: boolean;
  // 其它设置
  [param: string]: string | number | boolean | any[];
}

export interface Setting {
  // 插件列表
  all_plugin: string[];
  // 群聊列表
  [group_id: number]: Group
}

const all_setting: Map<number, Setting> = new Map();

(async () => {
  const kokkoro_config: KokkoroConfig = getConfig();
  const uins: number[] = Object.keys(kokkoro_config.bots).map(Number);

  for (const uin of uins) {
    await initSetting(uin);
  }
})();

/**
 * 初始化 setting 数据
 * 
 * @param {number} uin 机器人账号
 */
async function initSetting(uin: number): Promise<void> {
  let setting: Setting;
  const setting_path = resolve(__workname, `data/bots/${uin}/setting.yml`);

  await readFile(setting_path, 'utf8')
    .then((value: string) => {
      setting = parse(value);
    })
    .catch(async (error: Error) => {
      if (!error.message.includes('ENOENT: no such file or directory')) {
        throw error;
      }
      setting = { all_plugin: [] };

      await saveSetting(setting_path, setting)
        .then(() => {
          logger.mark(`创建了新的设置文件：data/bots/${uin}/setting.yml`);
        })
        .catch((error: Error) => {
          throw error;
        })
    })
    .finally(() => {
      all_setting.set(uin, setting);
    })
}

/**
 * 获取所有群聊插件设置
 * 
 * @returns {Map} setting 集合
 */
export function getAllSetting() {
  return all_setting;
}

/**
 * 获取当前群聊插件设置
 * 
 * @param {number} uin - 群号
 * @returns {Setting} setting 对象
 */
export function getSetting(uin: number) {
  return all_setting.get(uin);
}

// 写入群聊插件设置
export async function setSetting(uin: number, setting: Setting) {
  const setting_path = resolve(__workname, `data/bots/${uin}/setting.yml`);

  try {
    await saveSetting(setting_path, setting);
    all_setting.set(uin, setting);
  } catch (error) { }
}

export function saveSetting(path: string, setting: Setting): Promise<void> {
  return writeFile(path, stringify(setting));
}

export function updateAllPlugin(uin: number, all_plugin: string[]): Promise<void> {
  const setting = all_setting.get(uin)!;
  const setting_path = resolve(__workname, `data/bots/${uin}/setting.yml`);

  setting!.all_plugin = all_plugin;
  return saveSetting(setting_path, setting);
}

// //#region 获取当前插件的群聊选项
// function getOption(event: GroupMessageEvent) {
//   const { self_id, group_id } = event;

//   const stack = getStack();
//   const regex = /\w+(?=(\\|\/)index\.js)/g;
//   const setting = all_setting.get(self_id) as Setting;
//   const fileName = stack[2].getFileName()?.replace('/lib/', '/') as string;
//   const [plugin_name] = fileName.match(regex) as string[];

//   return setting[group_id].plugin[plugin_name] ?? {};
// }
// //#endregion

// // #dregion 获取当前插件的群聊选项
// async function setOption(params: ReturnType<typeof parseCommand>['params'], event: GroupMessageEvent) {
//   let message;
//   let new_value: string | number | boolean | any[];

//   const { self_id, group_id } = event;
//   const [plugin_name, option_name, value] = params;
//   const setting = all_setting.get(self_id) as Setting;

//   if (!setting[group_id] || !setting[group_id].plugin[plugin_name]) {
//     return `Error: ${plugin_name} is not defined, please input ">enable ${plugin_name}" parse plugin`;
//   }

//   const plugin = setting[group_id].plugin;

//   switch (true) {
//     case !option_name:
//       message = `"${plugin_name}": ${JSON.stringify(plugin[plugin_name], null, 2)}`;
//       break;
//     case !value:
//       message = '参数不能为空';
//       break;
//   }

//   if (message) {
//     return message;
//   }

//   const old_value = plugin[plugin_name][option_name];

//   switch (true) {
//     case ['true', 'false'].includes(value):
//       new_value = value === 'true';
//       break;

//     case /^(-?[1-9]\d*|0)$/.test(value):
//       new_value = Number(value);
//       break;

//     default:
//       new_value = value;
//       break;
//   }

//   // 校验参数是否合法
//   switch (true) {
//     case !Array.isArray(old_value) && typeof old_value !== typeof new_value:
//       if (old_value) {
//         message = `Error: ${plugin_name}.${option_name} 应为 ${typeof old_value} 类型`;
//       } else {
//         message = `Error: ${option_name} is not defined`;
//       }
//       break;

//     case Array.isArray(old_value) && !old_value.includes(new_value):
//       message = `Error: 属性 ${option_name} 的合法值为 [${(old_value as any[]).join(', ')}]`;
//       break;
//   }

//   if (message) {
//     return message;
//   }

//   if (Array.isArray(old_value)) {
//     new_value = old_value.sort(i => i === new_value ? -1 : 0)
//   }

//   setting[group_id].plugin[plugin_name][option_name] = new_value;
//   all_setting.set(self_id, setting);

//   await setSetting(self_id);
//   return `${plugin_name}: {\n  ${option_name}: ${!Array.isArray(new_value) ? new_value : `[${new_value.join(', ')}]`}\n}`;
// }
// // #endregion

// //#region 获取群聊插件列表
// async function getList(event: GroupMessageEvent): Promise<string> {
//   const { self_id, group_id } = event;
//   const { plugin } = all_setting.get(self_id)?.[group_id] ?? { plugin: {} };
//   const message = ['// 如要查看更多信息可输入 >setting\n"list": {'];

//   for (const key in plugin) message.push(`  "${key}": ${plugin[key].apply}`);

//   message.push('}');
//   return message.join('\n');
// }
// //#endregion

// async function settingHanders(params: ReturnType<typeof parseCommand>['params'], event: GroupMessageEvent): Promise<string> {
//   const { group_id, self_id } = event;
//   let message: string;

//   switch (true) {
//     case !params.length:
//       const setting = `"${group_id}": ${JSON.stringify(all_setting.get(self_id)?.[group_id] ?? {}, null, 2)}`;

//       message = setting;
//       break;

//     default:
//       message = `Error: 未知参数 "${params[0]}"`;
//       break;
//   }

//   return message;
// }
// export {
//   Option, Setting,
//   setSetting, getSetting, getAllSetting, getList, getOption, setOption, settingHanders,
// }