import { join, resolve } from 'path';
import { EventEmitter } from 'events';
import { getLogger, Logger } from 'log4js';
import { Dirent } from 'fs';
import { mkdir, readdir } from 'fs/promises';
import { decache, getStack } from '@kokkoro/utils';

import { logger } from '@/kokkoro';
import { getConfig } from '@/config';

const modules_path = resolve('node_modules');
const plugins_path = resolve('plugins');
const pluginList: Map<string, Plugin> = new Map();

/** 插件信息 */
export interface PluginInfo {
  /** 插件名 */
  name: string;
  /** 文件夹 */
  folder: string;
  /** 插件文件 */
  filename: string;
  /** 是否是本地插件 */
  local: boolean;
}

/**
 * 检索可用插件信息
 *
 * @returns 插件信息列表
 */
export async function retrievalPluginInfos(): Promise<PluginInfo[]> {
  const pluginDirs: Dirent[] = [];
  const moduleDirs: Dirent[] = [];
  const pluginInfos: PluginInfo[] = [];

  try {
    const dirs = await readdir(plugins_path, { withFileTypes: true });
    pluginDirs.push(...dirs);
  } catch (error) {
    await mkdir(plugins_path);
  }

  for (const dir of pluginDirs) {
    if (dir.isDirectory() || dir.isSymbolicLink()) {
      const folder = dir.name;
      const name = folder.replace('kokkoro-plugin-', '');

      try {
        const filename = require.resolve(join(plugins_path, folder));
        const info: PluginInfo = {
          local: true,
          name, folder, filename,
        };

        pluginInfos.push(info);
      } catch { }
    }
  }

  try {
    const dirs = await readdir(modules_path, { withFileTypes: true });
    moduleDirs.push(...dirs);
  } catch (err) {
    await mkdir(modules_path);
  }

  for (const dir of moduleDirs) {
    if (dir.isDirectory() && dir.name.startsWith('kokkoro-plugin-')) {
      const folder = dir.name;
      const name = folder.replace('kokkoro-plugin-', '');

      try {
        const filename = require.resolve(join(modules_path, folder));
        const info: PluginInfo = {
          local: false,
          name, folder, filename,
        };
        pluginInfos.push(info);
      } catch { }
    }
  }
  return pluginInfos;
};

export function getPluginList(): Map<string, Plugin> {
  return pluginList;
}

/**
 * 获取插件实例
 *
 * @param name - 插件名
 * @returns 插件实例
 */
function getPlugin(name: string): Plugin {
  if (!pluginList.has(name)) {
    throw new Error(`plugin "${name}" is undefined`);
  }
  return pluginList.get(name)!;
}

/**
 * 导入插件模块
 *
 * @param info - 插件信息
 * @returns 插件实例对象
 */
export function importPlugin(info: PluginInfo): Plugin {
  const { name, filename } = info;

  if (pluginList.has(name)) {
    return getPlugin(name);
  }

  try {
    require(filename);
    logger.mark(`plugin "${name}" import success`);

    return pluginList.get(name)!;
  } catch (error) {
    const message = `import module "${name}" failed, ${(<Error>error).message}`;
    logger.error(`plugin "${name}" import failure`);

    throw new Error(message);
  }
}

/**
 * 销毁插件模块
 *
 * @param info - 插件信息
 */
export function destroyPlugin(info: PluginInfo): void {
  const { filename, name } = info;

  decache(filename);
  pluginList.delete(name);
}

/**
 * 获取插件信息
 * 
 * @returns 插件信息
 */
function getPluginInfo(): PluginInfo {
  const stack = getStack();
  const filename = stack[2].getFileName()!;

  const regex = /(?<=(\\|\/)(node_modules|plugins)(\\|\/)).+?(?=(\\|\/))/;
  const folder = regex.exec(filename)?.[0] ?? 'kokkoro';
  const name = folder.replace('kokkoro-plugin-', '');
  const local = filename.indexOf('node_modules') === -1;

  return {
    name, folder, filename, local,
  };
}

export class Plugin extends EventEmitter {
  /** 版本号 */
  private v: string;
  /** 帮助提示 */
  private h?: string;

  /** 插件信息 */
  public info: PluginInfo;
  /** 日志 */
  public logger: Logger;

  constructor(
    /** 指令前缀 */
    public prefix: string = '',
  ) {
    super();

    const info = getPluginInfo();

    this.v = 'none';
    this.info = info;
    this.logger = getLogger(`[plugin:${info.name}]`);
    this.logger.level = getConfig('log_level');

    pluginList.set(info.name, this);
  }

  /**
   * 获取插件名。
   */
  public getName(): string {
    return this.info.name;
  }

  /**
   * 设置插件版本。
   * 
   * @param v - 若不设置则默认 "none"。
   */
  public version(v: string): this {
    this.v = v;
    return this;
  }

  /**
   * 自定义插件帮助信息。
   */
  public help(message: string): this {
    this.h = message;
    return this;
  }
}
