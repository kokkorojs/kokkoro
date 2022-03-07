import { join } from 'path';
import { PrivateMessageEvent, GroupMessageEvent } from 'oicq';
import { Dirent } from 'fs';
import { writeFile, readdir, mkdir } from 'fs/promises';

import { AllMessageEvent, Bot, getBot } from './bot';
import { logger } from './util';
import { getAllSetting, getSetting, setSetting, Option, Setting } from './setting';

// 所有插件实例
const all_plugin = new Map<string, Plugin>();
const plugins_path = join(__workname, '/plugins');
const modules_path = join(__workname, '/node_modules');

export interface Extension {
  option?: Option;
  onMessage?(this: Bot, event: AllMessageEvent): void;
  onGroupMessage?(this: Bot, event: GroupMessageEvent): void;
  onPrivateMessage?(this: Bot, event: PrivateMessageEvent): void;
}

class Plugin {
  private option?: Option;
  private readonly name: string;
  private readonly path: string;
  private readonly roster = new Map<number, Extension>();

  constructor(name: string, path: string) {
    require(path);

    this.name = name;
    this.path = require.resolve(path);
  }

  private async updateSetting(bot: Bot) {

  }

  async enable(bot: Bot): Promise<void> {
    const { uin } = bot;

    if (this.roster.has(uin)) {
      throw new Error("这个机器人实例已经启用了此扩展");
    }

    const module = require.cache[this.path]!;
    const extension: Extension = new module.exports.default();

    if (extension.option) this.option = extension.option;
    if (extension.onMessage) bot.on('message', extension.onMessage);
    if (extension.onGroupMessage) bot.on('message.group', extension.onGroupMessage);
    if (extension.onPrivateMessage) bot.on('message.private', extension.onPrivateMessage);

    this.roster.set(uin, extension);
  }

  async disable(bot: Bot): Promise<void> {
    const { uin } = bot;

    if (!this.roster.has(uin)) {
      throw new Error(`这个机器人实例尚未启用此扩展`);
    }

    const extension = this.roster.get(uin)!;

    if (extension.onMessage) bot.off('message', extension.onMessage);
    if (extension.onGroupMessage) bot.off('message.group', extension.onGroupMessage);
    if (extension.onPrivateMessage) bot.off('message.private', extension.onPrivateMessage);

    this.roster.delete(uin);
  }

  async destroy() {
    this.roster.forEach(async (_, uin) => {
      const bot = getBot(uin)!;
      await this.disable(bot);
    })

    delete require.cache[this.path];
  }

  async reload(): Promise<void> {
    await this.destroy();
    require(this.path);

    this.roster.forEach(async (_, uin) => {
      const bot = getBot(uin)!;

      await Promise.all([this.disable(bot), this.enable(bot)])
        .catch(error => {
          throw new Error(`重启插件时遇到错误\n${error.message}`);
        })
    })
  }
}

// export class KokkoroPlugin {
//   // readonly bot: Bot;
//   // readonly path: string;
//   // readonly option: Option;
//   // readonly apply = new Set<Bot>();

//   // constructor(bot: Bot) {
//   constructor(name: string, path: string) {
//     // this.bot = bot;
//     // this.bot.on('message', this.onMessage);
//     // this.bot.on('message.group', this.onGroupMessage);
//     // this.bot.on('message.private', this.onPrivateMessage);
//     // this.path = require.resolve(path);
//     import(path)
//       .then(Module => {
//         new Module()
//         console.log('success')
//       })
//       .catch(error => {
//         console.log(error)
//       })
//     //   this.option = require(path).default_option;
//   }

//   // onMessage(event: GroupMessageEvent | PrivateMessageEvent | DiscussMessageEvent) { }
//   // onGroupMessage(event: GroupMessageEvent) { }
//   // onPrivateMessage(event: PrivateMessageEvent) { }

//   // async _editBotPluginCache(bot: Bot, method: 'add' | 'delete') {
//   //   const { gl, uin } = bot;
//   //   const setting = getSetting(uin) as Setting;
//   //   const set: Set<string> = new Set(setting.all_plugin);

//   //     set[method](this.name);
//   //     setting.all_plugin = [...set];

//   //     // 写入群配置
//   //     gl.forEach((value: GroupInfo, group_id: number) => {
//   //       if (!setting[group_id]) {
//   //         setting[group_id] = {
//   //           name: value.group_name, plugin: {},
//   //         }
//   //       } else {
//   //         setting[group_id].name = value.group_name;
//   //       }

//   //       const default_option: Option = {
//   //         lock: false,
//   //         apply: true,
//   //       }

//   //       Object.assign(
//   //         default_option,
//   //         this.option,
//   //         setting[group_id] ? setting[group_id].plugin[this.name] : {}
//   //       )

//   //       setting[group_id].plugin[this.name] = default_option;
//   //     });

//   //     all_setting.set(uin, setting);
//   //     return setSetting(uin);
//   // }

//   // async enable(bot: Bot) {
//   //   if (this.apply.has(bot)) {
//   //     throw new ExtensionError("这个机器人实例已经启用了此插件");
//   //   }
//   //   const module = require.cache[this.path];

//   //   if (typeof module?.exports.enable !== "function") {
//   //     throw new ExtensionError("此插件未导出 enable 方法，无法启用");
//   //   }

//   //   try {
//   //     const enable_func = module?.exports.enable(bot);

//   //     if (enable_func instanceof Promise) await enable_func;

//   //     //       await this._editBotPluginCache(bot, "add");
//   //     this.apply.add(bot);
//   //   } catch (error) {
//   //     const { message } = error as ExtensionError;
//   //     throw new ExtensionError(`启用插件时遇到错误\n${message}`);
//   //   }
//   // }

//   // async disable(bot: Bot) {
//   //   if (!this.apply.has(bot)) {
//   //     throw new ExtensionError(`这个机器人实例尚未启用此插件`);
//   //   }
//   //   const module = require.cache[this.path];

//   //   if (typeof module?.exports.disable !== "function") {
//   //     throw new ExtensionError(`此插件未导出 disable 方法，无法禁用`);
//   //   }
//   //   try {
//   //     const disable_func = module?.exports.disable(bot);

//   //     if (disable_func instanceof Promise) await disable_func;

//   //     //       await this._editBotPluginCache(bot, "delete");
//   //     this.apply.delete(bot);
//   //   } catch (error) {
//   //     const { message } = error as ExtensionError;
//   //     throw new ExtensionError(`禁用插件时遇到错误\n${message}`)
//   //   }
//   // }

//   //   async goDie() {
//   //     const mod = require.cache[this.full_path] as NodeJS.Module;

//   //     try {
//   //       for (let bot of this.binds) {
//   //         await this.disable(bot);
//   //       }
//   //       if (typeof mod.exports.destroy === "function") {
//   //         const res = mod.exports.destroy();

//   //         if (res instanceof Promise) await res;
//   //       }
//   //     } catch { }

//   //     const ix = mod.parent?.children?.indexOf(mod) as number;

//   //     if (ix >= 0) mod.parent?.children.splice(ix, 1);

//   //     for (const fullpath in require.cache) {
//   //       if (require.cache[fullpath]?.id.startsWith(mod.path)) delete require.cache[fullpath];
//   //     }

//   //     delete require.cache[this.full_path];
//   //   }

//   //   async restart() {
//   //     try {
//   //       const binded = Array.from(this.binds);

//   //       await this.goDie();
//   //       require(this.path);

//   //       for (let bot of binded) await this.enable(bot);
//   //     } catch (error) {
//   //       const { message } = error as Error;

//   //       throw new ExtensionError(`重启插件时遇到错误\n${message}`);
//   //     }
//   //   }
// }

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
    if ((dir.isDirectory() || dir.isSymbolicLink()) && (dir.name === name || dir.name === "kokkoro-" + name)) {
      plugin_path = join(plugins_path, name);
      break;
    }
  }

  // 检索 npm 插件
  if (!plugin_path) {
    const module_dirs = await readdir(modules_path, { withFileTypes: true });

    for (const dir of module_dirs) {
      if (dir.isDirectory() && (dir.name === name || dir.name === "kokkoro-" + name)) {
        plugin_path = join(modules_path, name);
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
function getPlugin(name: string): Plugin {
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
  await getPlugin(name).goDie();

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
    if (dir.isDirectory() && dir.name.startsWith('kokkoro-') && dir.name !== 'kokkoro-core') {
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
 * @returns {Map} 插件集合
 */
export async function restorePlugin(bot: Bot) {
  const setting = getSetting(bot.uin)!;
  const all_plugin = setting.all_plugin;

  for (const name of all_plugin) {
    await importPlugin(name)
      .then(plugin => plugin.enable)
      .then(enable => enable(bot))
      .catch(error => logger.error(error.message))
  }

  return all_plugin;
}