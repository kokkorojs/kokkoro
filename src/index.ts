global.__workname = process.cwd();

export { linkStart } from './bot';
export { getOption, getSetting } from './setting';
export { colors, logger, message, checkCommand, getUserLevel } from './util';