import { workerData } from 'worker_threads';

import { Bot } from '@/core';
import { BotWorkerData } from '@/worker';

const { uin, config } = <BotWorkerData>workerData;
const bot = new Bot(uin, config);

bot.linkStart()
  .then(() => {
    // TODO ⎛⎝≥⏝⏝≤⎛⎝ 干点什么好呢
  })
  .catch(() => {
    bot.terminate();
    bot.logger.error('登录失败，正在退出...');

    process.exit();
  })
