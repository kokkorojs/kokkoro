import { join } from 'path';
import { Dirent } from 'fs';
import { readdir, mkdir } from 'fs/promises';
import { PrivateMessageEvent, GroupMessageEvent, GroupInfo, MemberIncreaseEvent, MemberDecreaseEvent } from 'oicq';

import { deepClone, logger } from './util';
import { AllMessageEvent, Bot, getBot } from './bot';
import { getSetting, setSetting, Option } from './setting';

// 所有插件实例
const all_plugin = new Map<string, Plugin>();
const plugins_path = join(__workname, '/plugins');
const modules_path = join(__workname, '/node_modules');

export interface Order {
  func: (...param: any) => any;
  regular: RegExp;
}

export interface Extension {
  bot: Bot;
  option?: Option;
  orders?: Order[];
  onInit?(): void;
  onDestroy?(): void;
  onMessage?(event: AllMessageEvent): void;
  onGroupMessage?(event: GroupMessageEvent): void;
  onPrivateMessage?(event: PrivateMessageEvent): void;
  onMemberIncrease?(event: MemberIncreaseEvent): void;
  onMemberDecrease?(event: MemberDecreaseEvent): void;
}

class Plugin {
  private option: Option;
  private readonly name: string;
  private readonly path: string;
  public readonly roster = new Map<number, Extension>();

  constructor(name: string, path: string) {
    require(path);

    this.name = name;
    this.path = require.resolve(path);
    this.option = { lock: false, apply: true };
  }

  private update(bot: Bot, method: 'add' | 'delete') {
    const uin = bot.uin;
    const group_list = bot.getGroupList();
    const setting = getSetting(uin)!;
    const plugins = new Set(setting.plugins);

    for (const [group_id, group] of group_list) {
      setting[group_id] ||= {
        name: group.group_name, plugin: {},
      };

      if (setting[group_id].name !== group.group_name) {
        setting[group_id].name = group.group_name;
      }

      const option = setting[group_id].plugin[this.name];
      setting[group_id].plugin[this.name] = { ...deepClone(this.option), ...option };
    }

    plugins[method](this.name);
    setting.plugins = [...plugins];

    return setSetting(uin, setting);
  }

  async enable(bot: Bot): Promise<void> {
    const { uin } = bot;

    if (this.roster.has(uin)) {
      throw new Error("这个机器人实例已经启用了此扩展");
    }

    const module = require.cache[this.path]!;
    const extension: Extension = module.exports.default
      ? new module.exports.default(bot)
      : new module.exports(bot);

    if (extension.option) Object.assign(this.option, extension.option);
    if (extension.onInit) extension.onInit();
    if (extension.onMessage) {
      extension.onMessage = extension.onMessage.bind(extension);
      bot.on('message', extension.onMessage);
    };
    if (extension.onGroupMessage) {
      extension.onGroupMessage = extension.onGroupMessage.bind(extension);
      bot.on('message.group', extension.onGroupMessage);
    }
    if (extension.onPrivateMessage) {
      extension.onPrivateMessage = extension.onPrivateMessage.bind(extension);
      bot.on('message.private', extension.onPrivateMessage);
    }
    if (extension.onMemberIncrease) {
      extension.onMemberIncrease = extension.onMemberIncrease.bind(extension);
      bot.on('notice.group.increase', event => {
        setTimeout(() => {
          extension.onMemberIncrease!(event)
        }, 500);
      });
    }
    if (extension.onMemberDecrease) {
      extension.onMemberDecrease = extension.onMemberDecrease.bind(extension);
      bot.on('notice.group.decrease', extension.onMemberDecrease);
    }

    await this.update(bot, 'add')
      .then(() => { this.roster.set(uin, extension); })
      .catch(error => { throw error; })
  }

  async disable(bot: Bot, update: boolean = true): Promise<void> {
    const { uin } = bot;

    if (!this.roster.has(uin)) {
      throw new Error(`这个机器人实例尚未启用此扩展`);
    }

    const extension = this.roster.get(uin)!;

    if (extension.onDestroy) extension.onDestroy();
    if (extension.onMessage) bot.off('message', extension.onMessage);
    if (extension.onGroupMessage) bot.off('message.group', extension.onGroupMessage);
    if (extension.onPrivateMessage) bot.off('message.private', extension.onPrivateMessage);
    if (extension.onMemberIncrease) bot.off('notice.group.increase', extension.onMemberIncrease);
    if (extension.onMemberDecrease) bot.off('notice.group.decrease', extension.onMemberDecrease);

    if (update) {
      await this.update(bot, 'delete')
        .catch(error => { throw error; })
    }
    this.roster.delete(uin);
  }

  async destroy() {
    const uins = [...this.roster.keys()];

    for (const uin of uins) {
      const bot = getBot(uin)!;

      await this.disable(bot, false)
        .catch(error => { throw new Error(`重启插件时遇到错误\n${error.message}`); });
    }

    const module = require.cache[this.path]!;
    const index = module.parent?.children.indexOf(module) as number;

    if (index >= 0) {
      module.parent?.children.splice(index, 1);
    }

    for (const path in require.cache) {
      if (require.cache[path]?.id.startsWith(module.path)) {
        delete require.cache[path]
      }
    }

    delete require.cache[this.path];
  }

  async reload(): Promise<void> {
    const uins = [...this.roster.keys()];

    try {
      await this.destroy()
      require(this.path);

      for (const uin of uins) {
        const bot = getBot(uin)!;
        await this.enable(bot);
      }
    } catch (error) {
      const { message } = error as Error;
      throw new Error(`重启插件时遇到错误\n${message}`);
    }
  }

  getOption() {
    return this.option;
  }
}

/**
 * 导入插件
 *
 * @param {string} name - 插件名
 * @returns {Plugin} 插件实例对象
 */
async function importPlugin(name: string): Promise<Plugin> {
  if (all_plugin.has(name)) return all_plugin.get(name)!;

  let plugin_path = '';
  const plugins_dir = await readdir(plugins_path, { withFileTypes: true });

  for (const dir of plugins_dir) {
    if ((dir.isDirectory() || dir.isSymbolicLink()) && (dir.name === name || dir.name === 'kokkoro-plugin-' + name)) {
      plugin_path = join(plugins_path, dir.name);
      break;
    }
  }

  // 检索 npm 插件
  if (!plugin_path) {
    const module_dirs = await readdir(modules_path, { withFileTypes: true });

    for (const dir of module_dirs) {
      if (dir.isDirectory() && (dir.name === name || dir.name === 'kokkoro-plugin-' + name)) {
        plugin_path = join(modules_path, dir.name);
        break;
      }
    }
  }

  if (!plugin_path) throw new Error(`插件名错误，无法找到此插件`);

  try {
    const plugin = new Plugin(name, plugin_path);

    all_plugin.set(name, plugin);

    return plugin;
  } catch (error) {
    const { message } = error as Error;
    throw new Error(`导入插件失败，不合法的 package\n${message}`);
  }
}

/**
 * 获取插件实例
 * 
 * @param {string} name - 插件名
 * @returns {Plugin} 插件实例
 */
export function getPlugin(name: string): Plugin {
  if (!all_plugin.has(name)) {
    throw new Error('尚未启用此插件');
  }

  return all_plugin.get(name)!;
}

/**
 * 删除插件实例
 * 
 * @param name - 插件名
 */
async function deletePlugin(name: string): Promise<void> {
  await getPlugin(name).destroy();

  all_plugin.delete(name);
}

/**
 * 重载插件
 * 
 * @param {string} name - 插件名
 * @returns {Promise}
 */
export function reloadPlugin(name: string, bot: Bot): Promise<void> {
  return getPlugin(name).reload();
}

/**
 * @param name - 插件名字
 * @param bot - bot 实例
 * @returns - void
 */
export async function enablePlugin(name: string, bot: Bot): Promise<void> {
  return (await importPlugin(name)).enable(bot);
}

/**
 * 禁用插件
 * 
 * @param {string} name - 插件名字
 * @param {Bot} bot - bot 实例
 * @returns {Promise}
 */
export function disablePlugin(name: string, bot: Bot): Promise<void> {
  return getPlugin(name).disable(bot);
}

/**
 * 禁用所有插件
 * 
 * @param {Bot} bot - bot 实例
 */
export async function disableAllPlugin(bot: Bot): Promise<void> {
  for (const [_, plugin] of all_plugin) {
    await plugin.disable(bot);
  }
}

/**
 * 检索所有可用插件
 */
export async function findAllPlugin() {
  const plugin_dirs: Dirent[] = [];
  const module_dirs: Dirent[] = [];
  const node_modules: string[] = [];
  const plugin_modules: string[] = [];

  try {
    plugin_dirs.push(...await readdir(plugins_path, { withFileTypes: true }));
  } catch (error) {
    await mkdir(plugins_path);
  }

  for (const dir of plugin_dirs) {
    if (dir.isDirectory() || dir.isSymbolicLink()) {
      try {
        const plugin_path = join(plugins_path, dir.name);

        require.resolve(plugin_path);
        plugin_modules.push(dir.name);
      } catch { }
    }
  }

  try {
    module_dirs.push(...await readdir(modules_path, { withFileTypes: true }));
  } catch (err) {
    await mkdir(modules_path);
  }

  for (const dir of module_dirs) {
    if (dir.isDirectory() && dir.name.startsWith('kokkoro-plugin-')) {
      try {
        const module_path = join(modules_path, dir.name);

        require.resolve(module_path);
        node_modules.push(dir.name);
      } catch { }
    }
  }

  return {
    plugin_modules, node_modules, all_plugin,
  }
}

/**
 * 机器人上线后恢复原先启用的插件
 *
 * @param {Bot} bot - 机器人实例
 * @returns {Promise} 插件数组集合
 */
export async function restorePlugin(bot: Bot): Promise<Map<string, Plugin>> {
  const setting = getSetting(bot.uin)!;
  const plugins = setting.plugins;

  for (const name of plugins) {
    try {
      await (await importPlugin(name)).enable(bot);
    } catch (error) {
      const { message } = error as Error;
      logger.error(message)
    }
  }

  return all_plugin;
}
