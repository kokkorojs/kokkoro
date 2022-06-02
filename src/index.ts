import { join } from 'path';

const cwd = process.cwd();
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

export const data_dir = join(cwd, 'data');
export const bot_dir = join(data_dir, 'bot');
export const plugins_dir = join(cwd, 'plugins');
export const modules_dir = join(cwd, 'node_modules');
