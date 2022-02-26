import { join } from 'path';
import { GroupInfo } from 'oicq';
import { Dirent } from 'fs';
import { writeFile, readdir, mkdir } from 'fs/promises';

import { Bot } from './bot';
import { logger } from './util';
import { getAllSetting, getSetting, setSetting, Option, Setting } from './setting';

const plugin_dir = join(__workname, '/plugins');
const module_dir = join(__workname, '/node_modules');
// 所有插件实例
const all_plugin = new Map<string, Plugin>();

class PluginError extends Error {
  name = "PluginError"
}

// #region Plugin 类
class Plugin {
  protected readonly full_path: string;
  readonly option: Option;
  readonly binds = new Set<Bot>();

  constructor(protected readonly name: string, protected readonly path: string) {
    this.full_path = require.resolve(this.path);
    this.option = require(this.path).default_option;
  }

  protected async _editBotPluginCache(bot: Bot, method: 'add' | 'delete') {
    const { gl, uin } = bot;

    const all_setting = getAllSetting();
    const setting = all_setting.get(uin) || { all_plugin: [] };
    const set: Set<string> = new Set(setting.all_plugin);

    set[method](this.name);
    setting.all_plugin = [...set];

    // 写入群配置
    gl.forEach((value: GroupInfo, group_id: number) => {
      if (!setting[group_id]) {
        setting[group_id] = {
          name: value.group_name, plugin: {},
        }
      } else {
        setting[group_id].name = value.group_name;
      }

      const default_option: Option = {
        lock: false,
        apply: true,
      }

      Object.assign(
        default_option,
        this.option,
        setting[group_id] ? setting[group_id].plugin[this.name] : {}
      )

      setting[group_id].plugin[this.name] = default_option;
    });

    all_setting.set(uin, setting);
    return setSetting(uin);
  }

  async enable(bot: Bot) {
    if (this.binds.has(bot)) {
      throw new PluginError("这个机器人实例已经启用了此插件");
    }

    const mod = require.cache[this.full_path];

    if (typeof mod?.exports.enable !== "function") {
      throw new PluginError("此插件未导出 enable 方法，无法启用");
    }

    try {
      const res = mod?.exports.enable(bot);

      if (res instanceof Promise) await res;

      await this._editBotPluginCache(bot, "add");
      this.binds.add(bot);
    } catch (error) {
      const { message } = error as Error;

      throw new PluginError(`启用插件时遇到错误\n${message}`);
    }
  }

  async disable(bot: Bot) {
    if (!this.binds.has(bot)) {
      throw new PluginError(`这个机器人实例尚未启用此插件`);
    }

    const mod = require.cache[this.full_path];

    if (typeof mod?.exports.disable !== "function") {
      throw new PluginError(`此插件未导出 disable 方法，无法禁用`);
    }
    try {
      const res = mod?.exports.disable(bot);

      if (res instanceof Promise) await res;

      await this._editBotPluginCache(bot, "delete");
      this.binds.delete(bot);
    } catch (error) {
      const { message } = error as Error;

      throw new PluginError(`禁用插件时遇到错误\n${message}`)
    }
  }

  async goDie() {
    const mod = require.cache[this.full_path] as NodeJS.Module;

    try {
      for (let bot of this.binds) {
        await this.disable(bot);
      }
      if (typeof mod.exports.destroy === "function") {
        const res = mod.exports.destroy();

        if (res instanceof Promise) await res;
      }
    } catch { }

    const ix = mod.parent?.children?.indexOf(mod) as number;

    if (ix >= 0) mod.parent?.children.splice(ix, 1);

    for (const fullpath in require.cache) {
      if (require.cache[fullpath]?.id.startsWith(mod.path)) delete require.cache[fullpath];
    }

    delete require.cache[this.full_path];
  }

  async restart() {
    try {
      const binded = Array.from(this.binds);

      await this.goDie();
      require(this.path);

      for (let bot of binded) await this.enable(bot);
    } catch (error) {
      const { message } = error as Error;

      throw new PluginError(`重启插件时遇到错误\n${message}`);
    }
  }
}
// #endregion

/**
 * 导入插件
 * 
 * @param name - 插件名
 * @returns - Plugin 对象
 */
async function importPlugin(name: string) {
  if (all_plugin.has(name)) return all_plugin.get(name) as Plugin;

  let plugin_path = '';
  const plugin_dirs = await readdir(plugin_dir, { withFileTypes: true });

  for (let dir of plugin_dirs) {
    if ((dir.isDirectory() || dir.isSymbolicLink()) && (dir.name === name || dir.name === "kokkoro-" + name)) {
      plugin_path = join(plugin_dir, name);
      break;
    }
  }

  // 加载 npm 插件
  if (!plugin_path) {
    const module_dirs = await readdir(module_dir, { withFileTypes: true });

    for (let dir of module_dirs) {
      if (dir.isDirectory() && (dir.name === name || dir.name === "kokkoro-" + name)) {
        plugin_path = join(module_dir, name);
        break;
      }
    }
  }

  if (!plugin_path) throw new PluginError(`插件名错误，无法找到此插件`);

  try {
    const plugin = new Plugin(name, plugin_path);
    all_plugin.set(name, plugin);

    return plugin
  } catch (error: any) {
    throw new PluginError(`导入插件失败，不合法的 package\n${error.message}`);
  }
}

// #region 校验导入插件
/**
 * @param name - 插件名
 * @returns - Plugin 对象
 */
function checkImported(name: string): Plugin {
  if (!all_plugin.has(name)) {
    throw new PluginError('尚未启用此插件')
  }

  return all_plugin.get(name) as Plugin
}
// #endregion

// #region 卸载插件
/**
 * @param name - 插件名
 * @throws {Error}
 */
async function deletePlugin(name: string): Promise<void> {
  await checkImported(name).goDie();

  all_plugin.delete(name);
}
// #endregion

// #region 重启插件
/**
 * @param name - 插件名
 * @throws {Error}
 * @returns - void
 */
function restartPlugin(name: string): Promise<void> {
  return checkImported(name).restart();
}
// #endregion

// #region 启用插件
/**
 * @param name - 插件名字
 * @param bot - bot 实例
 * @returns - void
 */
async function enable(name: string, bot: Bot): Promise<void> {
  const plugin = await importPlugin(name);

  return plugin.enable(bot);
}
// #endregion

// #region 禁用插件
/**
 * @param name - 插件名字
 * @param bot - bot 实例
 * @returns - void
 * @throws {Error}
 */
function disable(name: string, bot: Bot): Promise<void> {
  return checkImported(name).disable(bot)
}
// #endregion

// #region 禁用所有插件
/**
 * @param bot - bot 实例
 * @returns - void
 */
async function disableAllPlugin(bot: Bot): Promise<void> {
  for (let [_, plugin] of all_plugin) {
    try {
      await plugin.disable(bot);
    } catch { }
  }
}
// #endregion

// #region 检索所有可用插件
/**
 * @throws {Error}
 */
async function findAllPlugins() {
  const files: Dirent[] = [];
  const modules: Dirent[] = [];
  const node_modules: string[] = [];
  const plugin_modules: string[] = [];

  try {
    files.push(...await readdir(join(__workname, `/plugins`), { withFileTypes: true }))
  } catch (error) {
    await mkdir(join(__workname, `/plugins`));
  }

  for (let file of files) {
    if (file.isDirectory() || file.isSymbolicLink()) {
      try {
        require.resolve(`${__workname}/plugins/${file.name}`);
        plugin_modules.push(file.name);
      } catch { }
    }
  }

  try {
    modules.push(...await readdir(module_dir, { withFileTypes: true }));
  } catch (err) {
    await mkdir(join(__workname, `/node_modules`));
  }

  for (let file of modules) {
    if (file.isDirectory() && file.name.startsWith('kokkoro-') && file.name !== 'kokkoro-core') {
      try {
        require.resolve(`${__workname}/node_modules/${file.name}`);
        node_modules.push(file.name);
      } catch { }
    }
  }

  return {
    plugin_modules, node_modules, all_plugin,
  }
}
// #endregion

/**
 * bot 启动后恢复它原先绑定的插件
 * 
 * @param bot - bot 实例
 * @returns Map<string, Plugin>
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

export default {
  // deletePlugin, restartPlugin, enable, disable, disableAllPlugin, findAllPlugins, restorePlugins,
}