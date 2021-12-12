import { join } from 'path'
import { Client, GroupInfo } from 'oicq'
import { Dirent } from 'fs'
import { writeFile, readdir, mkdir } from 'fs/promises'

import { tips, logger } from './util'
import { Group, Option, Setting } from '..'
import { getSetting } from './setting'

// 所有插件实例
const plugins = new Map<string, Plugin>()
const { error } = tips;

class PluginError extends Error {
  name = "PluginError";
}

// #region Plugin 类
class Plugin {
  protected readonly fullpath: string;
  readonly option: Option;
  readonly binds = new Set<Client>();

  constructor(protected readonly name: string, protected readonly path: string) {
    this.fullpath = require.resolve(this.path);
    this.option = require(this.path).default_option;
  }

  protected async _editBotPluginCache(bot: Client, method: 'add' | 'delete') {
    const setting = getSetting(bot.uin) as Setting;
    const set: Set<string> = new Set(setting.all_plugin);
    const setting_path = join(bot.dir, 'setting.json');

    set[method](this.name);
    setting.all_plugin = [...set];

    // 写入群配置
    const { gl } = bot;

    gl.forEach((value: GroupInfo, group_id: number) => {
      const default_option: Option = {
        lock: false,
        switch: true
      }

      Object.assign(
        default_option,
        this.option,
        setting[group_id] ? setting[group_id].plugin[this.name] : {}
      )

      setting[group_id].plugin[this.name] = default_option;
    });

    return writeFile(setting_path, `${JSON.stringify(setting, null, 2)}`);
  }

  async enable(bot: Client) {
    if (this.binds.has(bot)) {
      throw new PluginError("这个机器人实例已经启用了此插件");
    }

    const mod = require.cache[this.fullpath];

    if (typeof mod?.exports.enable !== "function") {
      throw new PluginError("此插件未导出 enable 方法，无法启用。");
    }

    try {
      const res = mod?.exports.enable(bot);

      if (res instanceof Promise) await res;

      await this._editBotPluginCache(bot, "add");
      this.binds.add(bot);
    } catch (error) {
      const { message } = error as Error;

      throw new PluginError(`启用插件时遇到错误\n${error} ${message}`);
    }
  }

  async disable(bot: Client) {
    if (!this.binds.has(bot)) {
      throw new PluginError(`这个机器人实例尚未启用此插件`);
    }

    const mod = require.cache[this.fullpath];

    if (typeof mod?.exports.disable !== "function") {
      throw new PluginError(`此插件未导出 disable 方法，无法禁用。`);
    }
    try {
      const res = mod?.exports.disable(bot);

      if (res instanceof Promise) await res;

      await this._editBotPluginCache(bot, "delete");
      this.binds.delete(bot);
    } catch (error) {
      const { message } = error as Error;

      throw new PluginError(`禁用插件时遇到错误\n${error} ${message}`)
    }
  }

  async goDie() {
    const mod = require.cache[this.fullpath] as NodeModule;

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

    delete require.cache[this.fullpath];
  }

  async restart() {
    try {
      const binded = Array.from(this.binds);

      await this.goDie();
      require(this.path);

      for (let bot of binded) await this.enable(bot);
    } catch (error) {
      const { message } = error as Error;

      throw new PluginError(`重启插件时遇到错误\n${error} ${message}`);
    }
  }
}
// #endregion

// #region 导入插件
/**
 * @param name - 插件名
 * @returns - Plugin 对象
 * @throws {Error}
 */
async function importPlugin(name: string): Promise<Plugin> {
  // 加载本地插件
  if (plugins.has(name)) return plugins.get(name) as Plugin

  let resolved = "";
  const files = await readdir(join(__workname, '/plugins'), { withFileTypes: true });

  for (let file of files) {
    if ((file.isDirectory() || file.isSymbolicLink()) && file.name === name) {
      resolved = join(__workname, '/plugins', name);
    }
  }
  // 加载 npm 插件
  if (!resolved) {
    const modules = await readdir(join(__workname, '/node_modules'), { withFileTypes: true });

    for (let file of modules) {
      if (file.isDirectory() && (file.name === name || file.name === "kokkoro-" + name)) {
        resolved = join(__workname, '/node_modules', file.name);
      }
    }
  }

  if (!resolved) throw new PluginError(`插件名错误，无法找到此插件`)

  try {
    const plugin = new Plugin(name, resolved);

    plugins.set(name, plugin);
    return plugin
  } catch (error) {
    const { message } = error as Error;

    throw new PluginError(`导入插件失败，不合法的 package\n${error} ${message}`);
  }
}
// #endregion

// #region 校验导入插件
/**
 * @param name - 插件名
 * @returns - Plugin 对象
 */
function checkImported(name: string): Plugin {
  if (!plugins.has(name)) {
    throw new PluginError("尚未安装此插件")
  }

  return plugins.get(name) as Plugin
}
// #endregion

// #region 卸载插件
/**
 * @param name - 插件名
 * @throws {Error}
 */
async function deletePlugin(name: string): Promise<void> {
  await checkImported(name).goDie();

  plugins.delete(name);
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
async function enable(name: string, bot: Client): Promise<void> {
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
function disable(name: string, bot: Client): Promise<void> {
  return checkImported(name).disable(bot)
}
// #endregion

// #region 禁用所有插件
/**
 * @param bot - bot 实例
 * @returns - void
 */
async function disableAll(bot: Client): Promise<void> {
  for (let [_, plugin] of plugins) {
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
    modules.push(...await readdir(join(__workname, '/node_modules'), { withFileTypes: true }));
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
    plugin_modules, node_modules, plugins
  }
}
// #endregion

// #region bot 启动后恢复它原先绑定的插件
/**
 * @param bot - bot 实例
 * @returns Map<string, Plugin>
 */
async function restorePlugins(bot: Client): Promise<Map<string, Plugin>> {
  const setting_path = join(bot.dir, 'setting.json');

  try {
    const setting = require(setting_path);
    const { all_plugin } = setting as Setting;

    for (let name of all_plugin) {
      try {
        const plugin = await importPlugin(name);

        await plugin.enable(bot);
      } catch (error) {
        const { message } = error as Error;

        logger.error(message);
      }
    }
  } catch { }

  return plugins
}
// #endregion

export default {
  deletePlugin, restartPlugin, enable, disable, disableAll, findAllPlugins, restorePlugins
}