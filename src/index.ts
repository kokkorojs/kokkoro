declare global {
  // 当前进程目录
  var __workname: string;
}
global.__workname = process.cwd();

const logo = `
|   _  |  |   _  ._ _    ._ _   _. o o   _|_  _  ._  ._   _ |_  o   |
|< (_) |< |< (_) | (_)   | | | (_| | |    |_ (/_ | | | |  > | | |   |
                                   ╯                                o
`;
console.log(`\u001b[32m${logo}\u001b[0m`);

const { upday, version, changelogs } = require('../package.json');

export const KOKKORO_UPDAY = upday;
export const KOKKORO_VERSION = version;
export const KOKKORO_CHANGELOGS = changelogs;

export { Bot, startup } from './bot';
export { Option, Plugin } from './plugin';
export { logger, section } from './util';

// // export { AllMessageEvent, Bot, startup } from './bot';
// // export { Option, getOption, getSetting } from './setting';
// // export { colors, logger, section, getOrder, deepMerge, deepClone } from './util';
