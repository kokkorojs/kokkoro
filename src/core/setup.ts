import { logger } from '@/utils';
import { getConfig, } from '@/config'
import { createBot, getBotMap } from '@/core';
import { VERSION, UPDAY, CHANGELOGS } from '@/kokkoro';
import { retrievalPlugins, mountPlugin } from '@/plugin';

/**
 * 创建机器人服务
 */
function createBots() {
  const bots = getConfig('bots');
  const uins = Object.keys(bots).map(Number);
  const uins_length = uins.length;

  // TODO ／人◕ ‿‿ ◕人＼ v2 将会开发 web 后台统一管理账号
  if (uins_length > 1) {
    throw new Error('v1 暂不支持多账号登录，若要在终端并发登录可自行 fork 修改源码');
  }
  for (let i = 0; i < uins_length; i++) {
    const uin = uins[i];
    const config = bots[uin];
    const bot = createBot(uin, config);

    // botThread.once('thread.bot.created', () => {
    //   botThread.logger.info(`已创建 bot(${uin}) 线程`);
    // });
  }
}

/**
 * 创建插件多线程服务
 */
async function createPlugins() {
  const plugins = await retrievalPlugins();
  //   const extension: PluginInfo = {
  //     name: 'kokkoro',
  //     folder: 'core',
  //     path: join(__dirname, '../plugin/extension.js'),
  //     local: true,
  //   };
  const infos = [...plugins];
  const infos_length = infos.length;

  for (let i = 0; i < infos_length; i++) {
    const info = infos[i];
    const plugin = mountPlugin(info);

    plugin.bl.forEach((bot) => {
      bot.emit('bot.profile.define', {
        name: plugin.getName(),
        option: plugin.option,
      });
    });
  }
}

export async function setup() {
  const logo = `
    |   _  |  |   _  ._ _    ._ _   _. o o   _|_  _  ._  ._   _ |_  o   |
    |< (_) |< |< (_) | (_)   | | | (_| | |    |_ (/_ | | | |  > | | |   |
                                       ╯                                o
  `;
  process.title = 'kokkoro';
  console.log(`\u001b[32m${logo}\u001b[0m`);

  logger.mark(`----------`);
  logger.mark(`Package Version: kokkoro@${VERSION} (Released on ${UPDAY})`);
  logger.mark(`View Changelogs: ${CHANGELOGS}`);
  logger.mark(`----------`);

  try {
    createBots();
    await createPlugins();

    const bl = getBotMap();

    bl.forEach((bot) => {
      bot.linkStart();
    });
  } catch (error) {
    logger.error((<Error>error).message);
    process.exit();
  }
}
