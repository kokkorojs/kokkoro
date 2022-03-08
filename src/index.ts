// 全局对象
declare global {
  // 当前进程目录
  var __workname: string;
}

global.__workname = process.cwd();

export { AllMessageEvent, Bot, startup } from './bot';
export { Extension, Order } from './plugin';
export { Option, getOption } from './setting';
export { colors, logger, section, checkOrder } from './util';