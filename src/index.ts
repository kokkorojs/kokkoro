// 全局对象
declare global {
  // 当前进程目录
  var __workname: string;
}

global.__workname = process.cwd();

export { AllMessageEvent, Bot, startup } from './bot';
export { Extension } from './plugin';
// export { getSetting } from './setting';
// export { colors, logger, section, checkCommand, getUserLevel } from './util';