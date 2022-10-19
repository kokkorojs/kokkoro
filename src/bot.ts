import { isMainThread, workerData } from 'worker_threads';
import { BotConfig, Bot } from '@/core';

type BotWorkerData = {
  uin: number;
  config: BotConfig;
};

if (isMainThread) {
  throw new Error('你在主线程跑这个干吗？');
} else {
  const { uin, config } = <BotWorkerData>workerData;
  const bot = new Bot(uin, config);

  bot.linkStart();
}
