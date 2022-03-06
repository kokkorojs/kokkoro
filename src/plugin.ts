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

class ExtensionError extends Error {
  name = "ExtensionError"
}

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

  async enable(bot: Bot) {
    const { uin } = bot;

    if (this.roster.has(uin)) {
      throw new ExtensionError("这个机器人实例已经启用了此扩展");
    }

    const module = require.cache[this.path]!;
    const extension: Extension = new module.exports.default();

    if (extension.option) this.option = extension.option;
    if (extension.onMessage) bot.on('message', extension.onMessage);
    if (extension.onGroupMessage) bot.on('message.group', extension.onGroupMessage);
    if (extension.onPrivateMessage) bot.on('message.private', extension.onPrivateMessage);

    this.roster.set(uin, extension);

    // await import(this.path)
    //   .then(module => {
    //     const extension: Extension = new module.default();

    //     if (extension.onMessage) bot.on('message', extension.onMessage);
    //     if (extension.onGroupMessage) bot.on('message.group', extension.onGroupMessage);
    //     if (extension.onPrivateMessage) bot.on('message.private', extension.onPrivateMessage);

    //     this.roster.set(uin, extension);
    //   })
    //   .catch((error: Error) => {
    //     throw new ExtensionError(`启用扩展时遇到错误\n${error.message}`);
    //   })
  }

  async disable(bot: Bot) {
    const { uin } = bot;

    if (!this.roster.has(uin)) {
      throw new ExtensionError(`这个机器人实例尚未启用此扩展`);
    }

    const extension = this.roster.get(uin)!;

    if (extension.onMessage) bot.off('message', extension.onMessage);
    if (extension.onGroupMessage) bot.off('message.group', extension.onGroupMessage);
    if (extension.onPrivateMessage) bot.off('message.private', extension.onPrivateMessage);

    this.roster.delete(uin);
  }

  async reload() {
    delete require.cache[this.path];
    require(this.path);

    this.roster.forEach(async (_, uin) => {
      const bot = getBot(uin)!;

      await this.disable(bot);
      await this.enable(bot);
    })

    // const ix = module.parent?.children?.indexOf(module) as number;
    // console.log(ix)
    // if (ix >= 0)
    //   module.parent?.children.splice(ix, 1);
    // for (const fullpath in require.cache) {
    //   if (require.cache[fullpath]?.id.startsWith(module.path)) {
    //     delete require.cache[fullpath]
    //   }
    // }


    // await this.disable(bot)
    //   .then(() => {
    //     // const plugin = new Plugin(this.name, this.path);
    //     // all_plugin.set(this.name, plugin);

    //     // 重载
    //     // plugin.enable(bot);
    //   })
    //   .catch(() => {

    //   })
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

  for (let dir of plugins_dir) {
    if ((dir.isDirectory() || dir.isSymbolicLink()) && (dir.name === name || dir.name === "kokkoro-" + name)) {
      plugin_path = join(plugins_path, name);
      break;
    }
  }

  // 检索 npm 插件
  if (!plugin_path) {
    const module_dirs = await readdir(modules_path, { withFileTypes: true });

    for (let dir of module_dirs) {
      if (dir.isDirectory() && (dir.name === name || dir.name === "kokkoro-" + name)) {
        plugin_path = join(modules_path, name);
        break;
      }
    }
  }

  if (!plugin_path) throw new ExtensionError(`插件名错误，无法找到此插件`);

  try {
    const plugin = new Plugin(name, plugin_path);
    all_plugin.set(name, plugin);

    return plugin;
  } catch (error) {
    const { message } = error as Error;
    throw new ExtensionError(`导入插件失败，不合法的 package\n${message}`);
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
    throw new ExtensionError('尚未启用此插件');
  }

  return all_plugin.get(name)!;
}

// #region 卸载插件
/**
 * @param name - 插件名
 * @throws {Error}
 */
// async function deletePlugin(name: string): Promise<void> {
//   await checkImported(name).goDie();

//   all_plugin.delete(name);
// }
// #endregion


/**
 * 重载插件
 * 
 * @param {string} name - 插件名
 * @returns {Promise}
 */
export async function reloadPlugin(name: string, bot: Bot): Promise<void> {
  return getPlugin(name).reload();
}

/**
 * @param name - 插件名字
 * @param bot - bot 实例
 * @returns - void
 */
export async function enablePlugin(name: string, bot: Bot): Promise<void> {
  const plugin = await importPlugin(name);

  return plugin.enable(bot);
}

// #region 

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
async function disableAllPlugin(bot: Bot): Promise<void> {
  for (let [_, plugin] of all_plugin) {
    try {
      await plugin.disable(bot);
    } catch { }
  }
}

/**
 * 检索所有可用插件
 */
async function findAllPlugins() {
  //   const files: Dirent[] = [];
  //   const modules: Dirent[] = [];
  const node_modules: string[] = [];
  const plugin_modules: string[] = [];

  //   try {
  //     files.push(...await readdir(join(__workname, `/plugins`), { withFileTypes: true }))
  //   } catch (error) {
  //     await mkdir(join(__workname, `/plugins`));
  //   }

  //   for (let file of files) {
  //     if (file.isDirectory() || file.isSymbolicLink()) {
  //       try {
  //         require.resolve(`${__workname}/plugins/${file.name}`);
  //         plugin_modules.push(file.name);
  //       } catch { }
  //     }
  //   }

  //   try {
  //     modules.push(...await readdir(module_dir, { withFileTypes: true }));
  //   } catch (err) {
  //     await mkdir(join(__workname, `/node_modules`));
  //   }

  //   for (let file of modules) {
  //     if (file.isDirectory() && file.name.startsWith('kokkoro-') && file.name !== 'kokkoro-core') {
  //       try {
  //         require.resolve(`${__workname}/node_modules/${file.name}`);
  //         node_modules.push(file.name);
  //       } catch { }
  //     }
  //   }

  //   return {
  //     plugin_modules, node_modules, all_plugin,
  //   }
}

/**
 * 机器人上线后恢复原先启用的插件
 *
 * @param {Bot} bot - 机器人实例
 * @returns {Map} 插件集合
 */
export async function restorePlugin(bot: Bot) {
  const setting = getSetting(bot.uin) as Setting;
  const all_plugin = setting.all_plugin;

  for (let name of all_plugin) {
    try {
      const plugin = await importPlugin(name);
      await plugin.enable(bot);
    } catch (error: any) {
      logger.error(error.message);
    }
  }

  return all_plugin;
}