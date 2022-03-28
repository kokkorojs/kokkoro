// 全局对象
declare global {
  // 当前进程目录
  var __workname: string;
}

declare module 'oicq' {
  export interface GroupMessageEvent {
    self_id: number;
  }
  export interface PrivateMessageEvent {
    self_id: number;
  }
  export interface DiscussMessageEvent {
    self_id: number;
  }
  export interface MemberIncreaseEvent {
    self_id: number;
  }
  export interface MemberDecreaseEvent {
    self_id: number;
  }
}

global.__workname = process.cwd();

const logo = `
|   _  |  |   _  ._ _    ._ _   _. o o   _|_  _  ._  ._   _ |_  o   |
|< (_) |< |< (_) | (_)   | | | (_| | |    |_ (/_ | | | |  > | | |   |
                                   ╯                                o
`;
console.log(`\u001b[32m${logo}\u001b[0m`);

export { Bot } from './bot';
// export { AllMessageEvent, Bot, startup } from './bot';
// export { Extension, Order } from './plugin';
// export { Option, getOption, getSetting } from './setting';
// export { colors, logger, section, getOrder, deepMerge, deepClone } from './util';
export { colors, logger } from './util';
