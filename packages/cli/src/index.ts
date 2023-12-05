#!/usr/bin/env node

import { cwd } from 'process';
import { join } from 'node:path';
import { program } from 'commander';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

import init from '@/init.js';
import start from '@/start.js';
import create from '@/create.js';

export const plugins_path = join(cwd(), `plugins`);
export const config_path = join(cwd(), 'kokkoro.json');

export const colors = {
  red: colorful(31),
  green: colorful(32),
  yellow: colorful(33),
  blue: colorful(34),
  magenta: colorful(35),
  cyan: colorful(36),
  white: colorful(37),
};
export const TIP_INFO = colors.cyan('Info:');
export const TIP_ERROR = colors.red('Error:');
export const TIP_WARN = colors.yellow('Warn:');
export const TIP_SUCCESS = colors.green('Success:');

const version = await getVersion();

init(program);
start(program);
create(program);

program.name('kokkoro').version(version, '-v, --version').parse();

/**
 * 控制台彩色打印
 *
 * @param {number} code - ANSI escape code
 * @returns {Function}
 */
function colorful(code: number): (msg: string) => string {
  return (msg: string) => `\u001b[${code}m${msg}\u001b[0m`;
}

async function getVersion() {
  const url = join(import.meta.url, '../../package.json');
  const path = fileURLToPath(url);
  const text = await readFile(path, 'utf8');
  const { version } = JSON.parse(text);

  return version;
}
