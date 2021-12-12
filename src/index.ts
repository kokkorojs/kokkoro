global.__workname = process.cwd();

import { Client } from 'oicq';

import { logger, colors } from './util';
import { loginBot, bindMasterEvents } from './bot';
import { KOKKORO_UPDAY, KOKKORO_VERSION, KOKKORO_CHANGELOGS } from './help';

const { cyan } = colors;

export async function linkStart() {
  // Acsii Font Name: Mini: http://patorjk.com/software/taag/
  const wellcome: string = `-------------------------------------------------------------------------------------
\\    / _  | |  _  _  ._ _   _    _|_  _    |   _  |  |   _  ._ _  
 \\/\\/ (/_ | | (_ (_) | | | (/_    |_ (_)   |< (_) |< |< (_) | (_)
-------------------------------------------------------------------------------------`;
  console.log(cyan(wellcome))

  logger.mark(`----------`);
  logger.mark(`Package Version: kokkoro@${KOKKORO_VERSION} (Released on ${KOKKORO_UPDAY})`);
  logger.mark(`View Changelogs：${KOKKORO_CHANGELOGS}`);
  logger.mark(`----------`);
  logger.mark(`项目启动完成，开始登录账号`);

  process.title = 'kokkoro';

  const all_bot: Map<number, Client> = await loginBot();

  if (!all_bot.size) logger.info(`当前无可登录的账号，请检查是否开启 auto_login`);

  all_bot.forEach(bot => {
    bot.once('system.online', () => {
      bindMasterEvents(bot);
      bot.logger.info(`可发送 ">help" 给机器人查看指令帮助`);
    });
  });
}

export { getOption } from './setting';
export { colors, tips, logger, lowdb, checkCommand, message } from './util';