#!/usr/bin/env node

import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { program } from 'commander';
import { colorful } from '@kokkoro/utils';
import init from '@/init.js';
import start from '@/start.js';
import plugin from '@/plugin.js';

interface Package {
  version: string;
}

async function getVersion(): Promise<string> {
  const url = new URL('../package.json', import.meta.url);
  const text = await readFile(url, 'utf-8');
  const { version } = <Package>JSON.parse(text);

  return version;
}

const root = process.cwd();
const version = await getVersion();

export const plugins_path = join(root, `plugins`);
export const config_path = join(root, 'kokkoro.json');

export const INFO = colorful('Cyan', 'Info');
export const ERROR = colorful('Red', 'Error');
export const WARN = colorful('Yellow', 'Warn');
export const SUCCESS = colorful('Green', 'Success');

init(program);
start(program);
plugin(program);

program.name('kokkoro').version(version, '-v, --version').parse();
