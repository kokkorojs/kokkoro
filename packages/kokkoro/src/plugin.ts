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

  return paths.toSorted().map(path => ({
    name: path.replace('plugins/', ''),
    loader: () => import(pathToFileURL(`${directory}/${path}`).href),
  }));
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

  return [...plugins, ...dependencies];
};
