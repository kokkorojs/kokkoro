global.__workname = process.cwd();

export { linkStart } from './bot';
export { getOption } from './setting';
export { colors, logger, message, checkCommand, getUserLevel } from './util';