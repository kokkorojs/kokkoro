import { join } from 'path';
import { app } from '@kokkoro/web';
import { buildView } from '@kokkoro/admin';
import { internalIpv4, publicIpv4 } from '@kokkoro/utils';

import { Bot } from '@/core';
import { getConfig } from '@/config';
import { importPlugin, retrievalPluginInfos } from '@/plugin';
import { CHANGELOGS, logger, UPDAY, VERSION } from '@/kokkoro';

/**
 * 创建机器人服务
 */
function createBotService(): void {
  const configs = getConfig('bots');
  const configs_length = configs.length;

  for (let i = 0; i < configs_length; i++) {
    const config = configs[i];
    const bot = new Bot(config);
  }
}

/**
 * 创建插件服务
 */
async function createPluginService(): Promise<void> {
  const pluginInfos = await retrievalPluginInfos();
  const system = {
    name: 'kokkoro',
    folder: 'kokkoro',
    filename: join(__dirname, 'system.js'),
    local: true,
  };

  pluginInfos.unshift(system);

  const infos_length = pluginInfos.length;

  for (let i = 0; i < infos_length; i++) {
    const info = pluginInfos[i];
    const plugin = importPlugin(info);
  }
}

async function createWebService(): Promise<void> {
  const develop = process.env['KOKKORO_DEVELOP'] === 'open';
  const { port, domain } = getConfig('server');
  const public_ip = await publicIpv4();
  const internal_ip = await internalIpv4();
  const api_url = `http://${develop ? internal_ip : public_ip}:${port}/api`;

  logger.info('View building, please wait patiently...');
  await buildView(api_url);
  logger.info('View build success');

  app.listen(port, async () => {
    logger.info(`----------`);
    !develop && logger.info(`Web serve started public IP at http://${domain ?? public_ip}:${port}`);
    logger.info(`Web serve started internal IP at http://${internal_ip}:${port}`);
    logger.info(`----------`);
  });
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

  process.title = 'kokkoro';
  console.log(`\u001b[32m${logo.join('\n')}\u001b[0m`);

  logger.info(`----------`);
  logger.info(`Package Version: kokkoro@${VERSION} (Released on ${UPDAY})`);
  logger.info(`View Changelogs: ${CHANGELOGS}`);
  logger.info(`----------`);

  try {
    createBotService();
    await createPluginService();
    await createWebService();
  } catch (error) {
    logger.fatal(error);
    process.exit(1);
  }
}
