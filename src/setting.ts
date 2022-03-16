import { resolve } from 'path';
import { stringify, parse } from 'yaml';
import { writeFile, readFile } from 'fs/promises';
import { GroupMessageEvent } from 'oicq';

import { Bot } from './bot';
import { parseCommand } from './command';
import { getStack, logger } from './util';
import { KokkoroConfig, getConfig } from './config';
import { getPlugin } from './plugin';

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
  // 插件锁定，默认 false
  lock?: boolean;
  // 插件开关，默认 true
  apply?: boolean;
  // 其它设置
  [param: string]: string | number | boolean | Array<string | number> | undefined;
}

export interface Setting {
  // 插件列表
  plugins: string[];
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
  const setting_path = resolve(__workname, `data/bot/${uin}/setting.yml`);

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
        throw error;
      }
      setting = { plugins: [] };

      await writeSetting(setting_path, setting)
        .then(() => {
          logger.mark(`创建了新的设置文件：data/bot/${uin}/setting.yml`);
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
 * @param {number} uin - bot 账号
 * @returns {Setting} setting 对象
 */
export function getSetting(uin: number): Setting {
  return JSON.parse(JSON.stringify(all_setting.get(uin)));
}

// 写入群聊插件设置
export async function setSetting(uin: number, setting: Setting) {
  const old_setting = getSetting(uin)!;
  const setting_path = resolve(__workname, `data/bot/${uin}/setting.yml`);

  if (JSON.stringify(old_setting) === JSON.stringify(setting)) {
    return;
  }

  try {
    await writeSetting(setting_path, setting);
    all_setting.set(uin, setting);
  } catch (error) {
    throw error;
  }
}

export function writeSetting(path: string, setting: Setting): Promise<void> {
  return writeFile(path, stringify(setting));
}

export function updatePlugins(uin: number, plugins: string[]): Promise<void> {
  const setting = getSetting(uin)!;
  const setting_path = resolve(__workname, `data/bot/${uin}/setting.yml`);

  setting!.plugins = [...plugins];
  return writeSetting(setting_path, setting);
}

/**
 * 获取群聊插件列表
 * 
 * @param {Bot} this - 机器人实例
 * @param {number} group_id - 群号
 * @returns {string}
 */
export function getList(uin: number, group_id: number): string {
  const plugin = getSetting(uin)[group_id].plugin;
  const message = { list: {} as { [k: string]: boolean } };

  for (const key in plugin) message.list[key] = plugin[key].apply as boolean;
  return stringify(message);
}

// 获取当前插件的群聊选项
export function getOption(event: GroupMessageEvent) {
  const self_id = event.self_id;
  const group_id = event.group_id;
  const stack = getStack();
  const regex = /\w+(?=(\\|\/)index\.js)/g;
  const setting = getSetting(self_id);
  const fileName = stack[2].getFileName()!.replace(/(\/lib\/|\\lib\\)/g, '/');
  const [plugin_name] = fileName.match(regex) as string[];

  return setting[group_id].plugin[plugin_name] ?? {};
}

/**
 * 获取当前插件的群聊选项
 * 
 * @param param 
 * @param event 
 * @returns 
 */
export async function setOption(param: ReturnType<typeof parseCommand>['param'], event: GroupMessageEvent) {
  let message = '';
  let new_value: string | number | boolean | Array<string | number>;

  const { group_id, self_id } = event as any;
  const [plugin_name, option_name, value] = param;
  const setting = getSetting(self_id);

  if (!setting[group_id] || !setting[group_id].plugin[plugin_name]) {
    return `Error: ${plugin_name} is not defined, please enable plugin`;
  }

  const plugin = setting[group_id].plugin;

  switch (true) {
    case !option_name:
      const option = {
        setu: plugin[plugin_name]
      }
      message = stringify(option);
      break;
    case !value:
      message = '参数不能为空';
      break;
  }

  if (message) {
    return message;
  }

  const old_value = plugin[plugin_name][option_name];

  switch (true) {
    case ['true', 'false'].includes(value):
      new_value = value === 'true';
      break;
    case /^(-?[1-9]\d*|0)$/.test(value):
      new_value = +value;
      break;
    default:
      new_value = value;
      break;
  }

  // 校验参数是否合法
  switch (true) {
    case !Array.isArray(old_value) && typeof old_value !== typeof new_value:
      if (old_value) {
        message = `Error: ${plugin_name}.${option_name} 应为 ${typeof old_value} 类型`;
      } else {
        message = `Error: ${option_name} is not defined`;
      }
      break;
    case Array.isArray(old_value) && !old_value.includes(new_value as string | number):
      message = `Error: 属性 ${option_name} 的合法值为 [${(old_value as (string | number)[]).join(', ')}]`;
      break;
  }

  if (message) {
    return message;
  }

  if (Array.isArray(old_value)) {
    new_value = old_value.sort(i => i === new_value ? -1 : 0)
  }
  setting[group_id].plugin[plugin_name][option_name] = new_value;

  try {
    await setSetting(self_id, setting);
    return '修改成功';
  } catch (error) {
    return (error as Error).message;
  }
}

export async function reloadSetting(bot: Bot) {
  const uin = bot.uin;
  const setting = getSetting(uin);
  const plugins = setting.plugins;
  const group_list = bot.getGroupList();

  for (const [group_id, group] of group_list) {
    const group_name = group.group_name;
    const group_setting = setting[group_id] ||= { name: group_name, plugin: {} };
    const group_plugin = group_setting.plugin;

    for (const plugin_name of plugins) {
      if (group_plugin[plugin_name]) continue;

      try {
        const plugin = getPlugin(plugin_name);
        group_plugin[plugin_name] = plugin.getOption();

        await setSetting(uin, setting);
      } catch {
        const set = new Set(plugins);

        set.delete(plugin_name);
        await updatePlugins(uin, [...set]);
      }
    }
  }
}
