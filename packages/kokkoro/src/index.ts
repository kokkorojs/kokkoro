import { Bot, mountPlugin } from '@kokkoro/core';
import { logger } from '@kokkoro/core/lib/logger.js';
import { getConfig } from '@/config.js';
import { retrievalPlugins } from '@/plugin.js';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

/**
 * 挂载所有插件
 */
async function mountAllPlugin(): Promise<void> {
  const plugins = await retrievalPlugins();

  for (let i = 0; i < plugins.length; i++) {
    const { folder, local } = plugins[i];

    if (local) {
      const path = join('plugins', folder, 'package.json');
      const pkg = JSON.parse(await readFile(path, 'utf8'));
      const filename = join('plugins', folder, pkg.main);

      await mountPlugin(`./${filename}`);
    } else {
      await mountPlugin(folder);
    }
  }
}

/**
 * 创建机器人服务
 */
async function createBotService(): Promise<void> {
  const { bots } = await getConfig();

  for (let i = 0; i < bots.length; i++) {
    const config = bots[i];
    const bot = new Bot(config);

    bot.online();
  }
}

async function getPackageInfo(): Promise<Record<string, string>> {
  const url = join(import.meta.url, '../../package.json');
  const path = fileURLToPath(url);
  const text = await readFile(path, 'utf8');
  const packageInfo = JSON.parse(text);

  return packageInfo;
}

export async function setup(): Promise<void> {
  // ⎛⎝≥⏝⏝≤⎛⎝ コッコロマジ天使！
  const logo = [
    '┌─────────────────────────────────────────────────────────────────────────────┐',
    '│    |   _  |  |   _  ._ _    ._ _   _. o o   _|_  _  ._  ._   _ |_  o   |    │',
    '│    |< (_) |< |< (_) | (_)   | | | (_| | |    |_ (/_ | | | |  > | | |   |    │',
    '│                                      _|                                o    │',
    '└─────────────────────────────────────────────────────────────────────────────┘',
  ];
  const { version, homepage } = await getPackageInfo();

  process.title = 'kokkoro';
  console.log(`\u001b[32m${logo.join('\n')}\u001b[0m`);

  logger.info(`----------`);
  logger.info(`Package Version: kokkoro@${version}`);
  logger.info(`View Documents: ${homepage}`);
  logger.info(`----------`);

  try {
    await mountAllPlugin();
    await createBotService();
  } catch (error) {
    logger.fatal(error);
    process.exit(1);
  }
}
