import { enableANSIColors } from 'bun';

import { Journal, LevelDebug, LevelError, LevelInfo, LevelWarn } from 'annal';

import { type LogLevel, loadConfig } from './config';
import { launch } from './runtime';

const LOG_LEVELS = {
  debug: LevelDebug,
  info: LevelInfo,
  warn: LevelWarn,
  error: LevelError,
} satisfies Record<LogLevel, number>;

const BANNER = [
  '┌─────────────────────────────────────────────────────────────────────────────┐',
  '│    |   _  |  |   _  ._ _    ._ _   _. o o   _|_  _  ._  ._   _ |_  o   |    │',
  '│    |< (_) |< |< (_) | (_)   | | | (_| | |    |_ (/_ | | | |  > | | |   |    │',
  '│                                      _|                                o    │',
  '└─────────────────────────────────────────────────────────────────────────────┘',
].join('\n');

/** 从当前工作目录读取配置并运行 Kokkoro。 */
export const run = async (): Promise<void> => {
  console.log(enableANSIColors ? `\u001b[32m${BANNER}\u001b[0m` : BANNER);

  const config = await loadConfig('kokkoro.json');
  const logger = new Journal({ scope: 'kokkoro', level: LOG_LEVELS[config.logger.level] });

  logger.info('正在启动');
  await launch(config, logger);
};
