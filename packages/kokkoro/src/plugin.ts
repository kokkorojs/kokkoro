import { Dirent } from 'node:fs';
import { resolve } from 'node:path';
import { mkdir, readdir } from 'fs/promises';

/** 插件 */
interface Plugin {
  /** 文件夹 */
  folder: string;
  /** 是否是本地插件 */
  local: boolean;
}

const plugins_path = resolve('plugins');
const modules_path = resolve('node_modules');

/**
 * 判断是否是合法的插件目录
 *
 * @param dir - 目录实例对象
 * @returns 是否是插件目录
 */
function isPluginFolder(dir: Dirent): boolean {
  return dir.isDirectory() || dir.isSymbolicLink();
}

/**
 * 检索可用插件信息
 *
 * @returns 插件信息列表
 */
export async function retrievalPlugins() {
  const pluginDirs: Dirent[] = [];
  const moduleDirs: Dirent[] = [];
  const plugins: Plugin[] = [];

  try {
    const dirs = await readdir(plugins_path, { withFileTypes: true });
    pluginDirs.push(...dirs);
  } catch (error) {
    await mkdir(plugins_path);
  }

  for (const dir of pluginDirs) {
    const is_plugin_folder = isPluginFolder(dir);

    if (!is_plugin_folder) {
      continue;
    }
    const folder = dir.name;

    try {
      const plugin: Plugin = {
        folder,
        local: true,
      };
      plugins.push(plugin);
    } catch {}
  }

  try {
    const dirs = await readdir(modules_path, { withFileTypes: true });
    moduleDirs.push(...dirs);
  } catch (err) {
    await mkdir(modules_path);
  }

  for (const dir of moduleDirs) {
    const is_plugin_folder = isPluginFolder(dir);

    if (is_plugin_folder && dir.name.startsWith('kokkoro-plugin-')) {
      const folder = dir.name;

      try {
        const plugin: Plugin = {
          folder,
          local: false,
        };
        plugins.push(plugin);
      } catch {}
    }
  }
  return plugins;
}
