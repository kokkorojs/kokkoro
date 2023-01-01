import { join } from 'path';

import { getConfig } from '@/config';
import { createBot, getBotList } from '@/core';
import { retrievalPluginInfos, importPlugin } from '@/plugin';
import { VERSION, UPDAY, CHANGELOGS, logger } from '@/kokkoro';

/**
 * 创建机器人服务
 */
function createBotServe(): void {
  const configs = getConfig('bots');
  const configs_length = configs.length;

  // TODO ／人◕ ‿‿ ◕人＼ v2 将会开发 web 后台统一管理账号
  if (configs_length > 1) {
    logger.error('v1 暂不支持多账号登录，若要在终端并发登录可自行 fork 修改源码');
    process.exit();
  }
  for (let i = 0; i < configs_length; i++) {
    const config = configs[i];
    const bot = createBot(config);
  }
}

/**
 * 创建插件服务
 */
async function createPluginServe(): Promise<void> {
  const pluginInfos = await retrievalPluginInfos();
  const system = {
    name: 'kokkoro',
    folder: 'kokkoro',
    filename: join(__dirname, '../system.js'),
    local: true,
  };

  pluginInfos.unshift(system);
  const infos_length = pluginInfos.length;

  for (let i = 0; i < infos_length; i++) {
    const info = pluginInfos[i];
    const plugin = importPlugin(info);
  }
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
    createBotServe();
    await createPluginServe();

    const bl = getBotList();
    const linkQueue = [];
    const uins = [...bl.keys()];
    const uins_length = uins.length;

    for (let i = 0; i < uins_length; i++) {
      const uin = uins[i];
      const bot = bl.get(uin)!;

      linkQueue.push(bot.linkStart());
    }
    await Promise.allSettled(linkQueue);
  } catch (error) {
    logger.error((<Error>error).message);
    process.exit(1);
  }
}
