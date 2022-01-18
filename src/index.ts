global.__workname = process.cwd();

export { linkStart } from './bot';
export { getOption, getSetting } from './setting';
export { colors, logger, section, checkCommand, getUserLevel } from './util';