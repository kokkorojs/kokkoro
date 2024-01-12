import { readFile } from 'node:fs/promises';
import { logger } from '@kokkoro/core';
import { createBots } from '@/bot.js';
import { mountPlugins } from '@/plugin.js';

export interface Package {
  name: string;
  version: string;
  main: string;
  homepage: string;
}

/**
 * ⎛⎝≥⏝⏝≤⎛⎝ コッコロマジ天使！
 */
export async function bootstrap(): Promise<void> {
  const messages = [
    '┌─────────────────────────────────────────────────────────────────────────────┐',
    '│    |   _  |  |   _  ._ _    ._ _   _. o o   _|_  _  ._  ._   _ |_  o   |    │',
    '│    |< (_) |< |< (_) | (_)   | | | (_| | |    |_ (/_ | | | |  > | | |   |    │',
    '│                                      _|                                o    │',
    '└─────────────────────────────────────────────────────────────────────────────┘',
  ];
  const slogan = `\u001b[32m${messages.join('\n')}\u001b[0m`;

  process.title = 'kokkoro';
  console.log(slogan);

  const url = new URL('../package.json', import.meta.url);
  const text = await readFile(url, 'utf-8');
  const { version, homepage } = <Package>JSON.parse(text);

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
