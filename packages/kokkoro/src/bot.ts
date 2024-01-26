import { Bot } from '@kokkoro/core';
import { getConfig } from '@/config.js';

/**
 * 创建机器人
 */
export async function createBots(): Promise<void> {
  const { log_level, bots, events, sandbox } = await getConfig();

  for (let i = 0; i < bots.length; i++) {
    const config = bots[i];

    config.events ??= events;
    config.sandbox ??= sandbox;
    config.log_level ??= log_level;

    new Bot(config).online();
  }
}
