import { file, fileURLToPath, Glob, pathToFileURL, resolveSync } from 'bun';

import { type PluginLoader } from '@kokkoro/core';

const DIRECTORIES = new Glob('plugins/*/');
const PACKAGE_PREFIX = 'kokkoro-plugin-';

interface PluginEntry {
  readonly name: string;
  readonly loader: PluginLoader;
}

const scanDirectory = async (directory: string): Promise<PluginEntry[]> => {
  const paths = await Array.fromAsync(DIRECTORIES.scan({ cwd: directory, onlyFiles: false, followSymlinks: true }));

  return Promise.all(
    paths.toSorted().map(async path => {
      const folderName = path.replace('plugins/', '');
      const pluginPath = `${directory}/${path}`;
      const manifest = file(`${pluginPath}/package.json`);
      const hasManifest = await manifest.exists();
      const { name } = hasManifest ? await manifest.json() : {};

      if (name === undefined) {
        return {
          name: folderName,
          loader: () => import(pathToFileURL(pluginPath).href),
        };
      }

      if (typeof name !== 'string' || name.length === 0) {
        throw new TypeError(`插件 ${folderName} 的 package.json 缺少有效的 name`);
      }
      return {
        name,
        loader: () => import(resolveSync(name, pluginPath)),
      };
    }),
  );
};

const scanDependencies = async (directory: string): Promise<PluginEntry[]> => {
  const manifest = file(`${directory}/package.json`);
  const hasManifest = await manifest.exists();

  if (!hasManifest) {
    return [];
  }
  const { dependencies = {} } = await manifest.json();

  return Object.keys(dependencies)
    .filter(name => name.startsWith(PACKAGE_PREFIX))
    .toSorted()
    .map(name => ({ name, loader: () => import(resolveSync(name, directory)) }));
};

export const findPlugins = async (directory = '.'): Promise<PluginEntry[]> => {
  const root = fileURLToPath(pathToFileURL(directory));
  const [plugins, dependencies] = await Promise.all([scanDirectory(root), scanDependencies(root)]);
  const entries = [...plugins, ...dependencies];
  const names = new Set<string>();

  for (const entry of entries) {
    if (names.has(entry.name)) {
      throw new Error(`插件 ${entry.name} 重复`);
    }
    names.add(entry.name);
  }
  return entries;
};
