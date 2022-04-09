import { resolve } from 'path';
import { stringify, parse } from 'yaml';
import { writeFile, readFile } from 'fs/promises';
// // import { GroupMessageEvent, MemberDecreaseEvent, MemberIncreaseEvent } from 'oicq';

// import { getConfig, KokkoroConfig } from "./config";

// // import { Bot } from './bot';
// // import { parseCommand } from './command';
import { deepClone, getStack, logger } from './util';
import { getExtensionList, Option } from './extension';
import { Bot } from './bot';
// // import { getPlugin } from './plugin';

// 群聊
export interface Group {
  // 群名称
  name: string;
  // 扩展
  extension: {
    // 扩展名
    [name: string]: Option;
  }
}

export interface Setting {
  // 扩展列表
  extensions: string[];
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
  let setting: Setting;
  const setting_path = resolve(__workname, `data/bot/${uin}/setting.yml`);

  return new Promise(async (resolve, reject) => {
    await readFile(setting_path, 'utf8')
      .then((value: string) => {
        setting = parse(value);

        if (!setting) {
          throw new Error('setting is empty file');
        }
      })
      .catch(async (error: Error) => {
        const rewrite = !error.message.includes('ENOENT: no such file or directory') && !error.message.includes('setting is empty file');

        if (rewrite) {
          reject(error);
        }
        const extension_list = getExtensionList();
        const extension_keys = extension_list.keys();

        setting = { extensions: [...extension_keys] };

        await writeSetting(uin, setting)
          .then(() => {
            logger.mark(`创建了新的设置文件: data/bot/${uin}/setting.yml`);
          })
          .catch((error: Error) => {
            reject(error);
          })
      })
      .finally(() => {
        setting_list.set(uin, setting);
        resolve(deepClone(setting));
      })
  })
}

// /**
//  * 获取所有群聊扩展设置
//  *
//  * @returns {Map} setting 集合
//  */
// export function getSettingList() {
//   return setting_list;
// }

/**
 * 获取当前群聊扩展设置
 *
 * @param {number} uin - bot 账号
 * @returns {Setting} setting 对象
 */
export function getSetting(uin: number): Setting | undefined {
  return setting_list.get(uin);
}



// // 写入群聊扩展设置
// export async function setSetting(uin: number, setting: Setting) {
//   if (!setting_list.has(uin)) {
//     throw new Error(`uin: ${uin} 不存在 setting.json`);
//   }
//   const old_setting = getSetting(uin)!;
//   const setting_path = resolve(__workname, `data/bot/${uin}/setting.yml`);

//   if (JSON.stringify(old_setting) !== JSON.stringify(setting)) {
//     try {
//       await writeSetting(setting_path, setting);
//       setting_list.set(uin, setting);
//     } catch (error) {
//       throw error;
//     }
//   }
// }

export function writeSetting(uin: number, setting: Setting): Promise<void> {
  const old_setting = setting_list.get(uin);
  const setting_path = resolve(__workname, `data/bot/${uin}/setting.yml`);

  if (JSON.stringify(old_setting) !== JSON.stringify(setting)) {
    return writeFile(setting_path, stringify(setting));
  } else {
    return Promise.resolve();
  }
}

/**
 * 更新 bot setting.yml (一般在进入或退出群聊时调用)
 * 
 * @param bot - bot 对象
 * @returns Promise
 */
// function updateSetting(bot: Bot): Promise<void> {
//   return new Promise((resolve, reject) => {
//     const group_list = bot.getGroupList();
//     const setting = bot.getSetting();

//     // 校验 option
//     for (const [group_id, group_info] of group_list) {
//       const { group_name } = group_info;

//       setting[group_id] ||= {
//         name: group_name, extension: {},
//       };

//       if (setting[group_id].name !== group_name) {
//         setting[group_id].name = group_name;
//       }
//       const option = setting[group_id].extension[name];

//       setting[group_id].extension[name] = deepMerge(extension.getOption(), option);
//     }
//   });
// }

// export function updateExtensionsSetting(uin: number, extensions: string[]): Promise<void> {
//   if (!setting_list.has(uin)) {
//     throw new Error(`data/bot/${uin}/setting.yml 不存在`);
//   }
//   const setting = getSetting(uin)!;

//   setting.extensions = [...extensions];
//   return writeSetting(uin, setting);
// }

// function updateGroupSetting(uin: number, group_id: number, group: Group) {

// }

// // /**
// //  * 获取群聊扩展列表
// //  *
// //  * @param {Bot} this - 机器人实例
// //  * @param {number} group_id - 群号
// //  * @returns {string}
// //  */
// // export function getList(uin: number, group_id: number): string {
// //   const plugin = getSetting(uin)[group_id].plugin;
// //   const message = { list: {} as { [k: string]: boolean } };

// //   for (const key in plugin) message.list[key] = plugin[key].apply as boolean;
// //   return stringify(message);
// // }

// // // 获取当前扩展的群聊选项
// // export function getOption(event: GroupMessageEvent | MemberIncreaseEvent | MemberDecreaseEvent) {
// //   const self_id = event.self_id;
// //   const group_id = event.group_id;
// //   const stack = getStack();
// //   const regex = /\w+(?=(\\|\/)index\.js)/g;
// //   const setting = getSetting(self_id);
// //   const fileName = stack[2].getFileName()!.replace(/(\/lib\/|\\lib\\)/g, '/');
// //   const [plugin_name] = fileName.match(regex) as string[];

// //   return setting[group_id].plugin[plugin_name] ?? {};
// // }

// // /**
// //  * 获取当前扩展的群聊选项
// //  *
// //  * @param param
// //  * @param event
// //  * @returns
// //  */
// // export async function setOption(param: ReturnType<typeof parseCommand>['param'], event: GroupMessageEvent) {
// //   let message = '';
// //   let new_value: string | number | boolean | Array<string | number>;

// //   const { group_id, self_id } = event as any;
// //   const [plugin_name, option_name, value] = param;
// //   const setting = getSetting(self_id);

// //   if (!setting[group_id] || !setting[group_id].plugin[plugin_name]) {
// //     return `Error: ${plugin_name} is not defined, please enable plugin`;
// //   }

// //   const plugin = setting[group_id].plugin;

// //   switch (true) {
// //     case !option_name:
// //       const option = {
// //         setu: plugin[plugin_name]
// //       }
// //       message = stringify(option);
// //       break;
// //     case !value:
// //       message = '参数不能为空';
// //       break;
// //   }

// //   if (message) {
// //     return message;
// //   }

// //   const old_value = plugin[plugin_name][option_name];

// //   switch (true) {
// //     case ['true', 'false'].includes(value):
// //       new_value = value === 'true';
// //       break;
// //     case /^(-?[1-9]\d*|0)$/.test(value):
// //       new_value = +value;
// //       break;
// //     default:
// //       new_value = value;
// //       break;
// //   }

// //   // 校验参数是否合法
// //   switch (true) {
// //     case !Array.isArray(old_value) && typeof old_value !== typeof new_value:
// //       if (old_value) {
// //         message = `Error: ${plugin_name}.${option_name} 应为 ${typeof old_value} 类型`;
// //       } else {
// //         message = `Error: ${option_name} is not defined`;
// //       }
// //       break;
// //     case Array.isArray(old_value) && !old_value.includes(new_value as string | number):
// //       message = `Error: 属性 ${option_name} 的合法值为 [${(old_value as (string | number)[]).join(', ')}]`;
// //       break;
// //   }

// //   if (message) {
// //     return message;
// //   }

// //   if (Array.isArray(old_value)) {
// //     new_value = old_value.sort(i => i === new_value ? -1 : 0)
// //   }
// //   setting[group_id].plugin[plugin_name][option_name] = new_value;

// //   try {
// //     await setSetting(self_id, setting);
// //     return '修改成功';
// //   } catch (error) {
// //     return (error as Error).message;
// //   }
// // }

// // export async function reloadSetting(bot: Bot) {
// //   const uin = bot.uin;
// //   const setting = getSetting(uin);
// //   const plugins = setting.plugins;
// //   const group_list = bot.getGroupList();

// //   for (const [group_id, group] of group_list) {
// //     const group_name = group.group_name;
// //     const group_setting = setting[group_id] ||= { name: group_name, plugin: {} };
// //     const group_plugin = group_setting.plugin;

// //     for (const plugin_name of plugins) {
// //       if (group_plugin[plugin_name]) continue;

// //       try {
// //         const plugin = getPlugin(plugin_name);
// //         group_plugin[plugin_name] = plugin.getOption();

// //         await setSetting(uin, setting);
// //       } catch {
// //         const set = new Set(plugins);

// //         set.delete(plugin_name);
// //         await updatePlugins(uin, [...set]);
// //       }
// //     }
// //   }
// // }
