import { Bot, mountPlugin, retrievalPluginInfos } from '@kokkoro/core';
import { app } from '@kokkoro/web';
import { rewriteBaseUrl } from '@kokkoro/admin';
import { internalIpv4, publicIpv4 } from '@kokkoro/utils';

import { getConfig, getPackage, logger } from './config';

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
  const infos_length = pluginInfos.length;

  for (let i = 0; i < infos_length; i++) {
    const info = pluginInfos[i];
    const plugin = mountPlugin(info);
  }
}

async function createWebService(): Promise<void> {
  const { port, domain } = getConfig('server');
  const develop = process.env['KOKKORO_DEVELOP'] === 'open';
  const public_ip = domain ?? await publicIpv4();
  const internal_ip = await internalIpv4();
  const base_url = `http://${develop ? internal_ip : public_ip}:${port}`;

  logger.info('View building, please wait patiently...');
  await rewriteBaseUrl(base_url);
  logger.info('View build success');

  app.listen(port, () => {
    logger.info(`----------`);
    !develop && logger.info(`Web serve started public IP at \u001b[34mhttp://${public_ip}:${port}\u001b[0m`);
    logger.info(`Web serve started internal IP at \u001b[34mhttp://${internal_ip}:${port}\u001b[0m`);
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
  const pkg = getPackage();

  process.title = 'kokkoro';
  console.log(`\u001b[32m${logo.join('\n')}\u001b[0m`);

  logger.info(`----------`);
  logger.info(`Package Version: kokkoro@${pkg.version} (Released on ${pkg.upday})`);
  logger.info(`View Changelogs: ${pkg.changelogs}`);
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
