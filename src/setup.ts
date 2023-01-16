import { getConfig } from '@/config';
import { CHANGELOGS, logger, UPDAY, VERSION } from '@/kokkoro';
import { Bot, importPlugin, retrievalPluginInfos } from '@/core';

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
  //   const system = {
  //     name: 'kokkoro',
  //     folder: 'kokkoro',
  //     filename: join(__dirname, '../system.js'),
  //     local: true,
  //   };

  //   pluginInfos.unshift(system);

  const infos_length = pluginInfos.length;

  for (let i = 0; i < infos_length; i++) {
    const info = pluginInfos[i];
    const plugin = importPlugin(info);
  }
}

async function createWebService(): Promise<void> {
  const app = await import('./web');
  const port = getConfig('port');
  const domain = '';

  // TODO ／人◕ ‿‿ ◕人＼ 生成随机账号
  app.default.listen(port, () => {
    logger.info(`web serve started at http://${domain ? domain : 'localhost'}:${port}`);
  });
}

export async function setup(): Promise<void> {
  // コッコロマジ天使！⎛⎝≥⏝⏝≤⎛⎝
  const logo = [
    '┌─────────────────────────────────────────────────────────────────────────────┐',
    '│    |   _  |  |   _  ._ _    ._ _   _. o o   _|_  _  ._  ._   _ |_  o   |    │',
    '│    |< (_) |< |< (_) | (_)   | | | (_| | |    |_ (/_ | | | |  > | | |   |    │',
    '│                                       ╯                                o    │',
    '└─────────────────────────────────────────────────────────────────────────────┘',
  ];

  process.title = 'kokkoro';
  console.log(`\u001b[32m${logo.join('\n')}\u001b[0m`);

  logger.mark(`----------`);
  logger.mark(`Package Version: kokkoro@${VERSION} (Released on ${UPDAY})`);
  logger.mark(`View Changelogs: ${CHANGELOGS}`);
  logger.mark(`----------`);

  try {
    createBotService();
    await createWebService();
    await createPluginService();
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}
