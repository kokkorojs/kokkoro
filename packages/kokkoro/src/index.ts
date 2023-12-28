import { readFile } from 'node:fs/promises';
import { colorful } from '@kokkoro/utils';
import { Bot, logger } from '@kokkoro/core';
import { getConfig } from '@/config.js';
import { mountPlugins } from '@/plugin.js';

export interface Package {
  name: string;
  version: string;
  main: string;
  homepage: string;
}

/**
 * 创建机器人
 */
async function createBots(): Promise<void> {
  const { log_level, bots, events } = await getConfig();

  for (let i = 0; i < bots.length; i++) {
    const config = bots[i];

    config.events ??= events;
    config.log_level ??= log_level;

    new Bot(config).online();
  }
}

async function getPackageInfo(): Promise<Package> {
  const url = new URL('../package.json', import.meta.url);
  const text = await readFile(url, 'utf-8');
  const packageInfo = <Package>JSON.parse(text);

  return packageInfo;
}

export async function setup(): Promise<void> {
  const { version, homepage } = await getPackageInfo();
  // ⎛⎝≥⏝⏝≤⎛⎝ コッコロマジ天使！
  const logo = [
    '┌─────────────────────────────────────────────────────────────────────────────┐',
    '│    |   _  |  |   _  ._ _    ._ _   _. o o   _|_  _  ._  ._   _ |_  o   |    │',
    '│    |< (_) |< |< (_) | (_)   | | | (_| | |    |_ (/_ | | | |  > | | |   |    │',
    '│                                      _|                                o    │',
    '└─────────────────────────────────────────────────────────────────────────────┘',
  ];
  const text = colorful('Green', logo.join('\n'));

  process.title = 'kokkoro';
  console.log(text);

  logger.info(`----------`);
  logger.info(`Package Version: kokkoro@${version}`);
  logger.info(`View Documents: ${homepage}`);
  logger.info(`----------`);

  try {
    await mountPlugins();
    await createBots();
  } catch (error) {
    logger.fatal(error);
    process.exit(1);
  }
}
