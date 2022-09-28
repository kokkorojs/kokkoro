import { logger } from '@kokkoro/utils';
import { runWorkerThreads } from './worker';

const { upday, version, changelogs } = require('../package.json');

export const UPDAY = upday;
export const VERSION = version;
export const CHANGELOGS = changelogs;

export function startup() {
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

  runWorkerThreads();
}

export { Plugin, Option } from './plugin';
