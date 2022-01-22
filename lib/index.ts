// 全局对象
declare global {
  // 当前进程目录
  var __workname: string;
}

declare module "oicq" {
  export interface GroupMessageEvent {
    self_id: number;
  }
  export interface PrivateMessageEvent {
    self_id: number;
  }
  export interface DiscussMessageEvent {
    self_id: number;
  }
}

global.__workname = process.cwd();

export { linkStart } from './bot';
export { getOption, getSetting } from './setting';
export { colors, logger, section, checkCommand, getUserLevel } from './util';