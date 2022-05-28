import { EventEmitter } from 'events';
import { getLogger, Logger } from 'log4js';
import { FlashElem, ImageElem, MessageElem, segment as messageSegment, TextElem } from 'oicq';

import { Bot } from './bot';
import { AllMessageEvent } from './events';

export const emitter = new EventEmitter();
export const logger: Logger = getLogger('[kokkoro]');
logger.level = 'all';

export const segment = {
  ...messageSegment, image,
};

/**
 * 生成图片消息段
 * 
 * @param {string} file - 图片文件
 * @param {boolean} flash - 是否生成闪图
 * @returns {ImageElem|FlashElem} 
 */
function image(file: string | Buffer, flash: boolean = false): ImageElem | FlashElem {
  if (!(file instanceof Buffer) && !/^https?/g.test(file)) {
    file = `file:///${file}`;
  }
  return !flash ? messageSegment.image(file) : messageSegment.flash(file);
}

type ScannerType = '' | 'line' | 'text' | 'image';

export class Scanner {
  constructor(
    private bot: Bot,
  ) {

  }

  next(user_id: number, callback: (message: MessageElem) => any) {
    const listen = (event: AllMessageEvent) => {
      if (event.sender.user_id === user_id) {
        const message = this.parseMessage('', event.message);

        if (!message.length) {
          return;
        }
        callback(message[0]);
        this.bot.off('message', listen);
      }
    };
    this.bot.on('message', listen);
  }

  nextLine(user_id: number, callback: (message: MessageElem[]) => any) {
    const listen = (event: AllMessageEvent) => {
      if (event.sender.user_id === user_id) {
        const message = this.parseMessage('line', event.message);

        if (!message.length) {
          return;
        }
        callback(message);
        this.bot.off('message', listen);
      }
    };
    this.bot.on('message', listen);
  }

  nextText(user_id: number, callback: (message: TextElem) => any) {
    const listen = (event: AllMessageEvent) => {
      if (event.sender.user_id === user_id) {
        const message = this.parseMessage('text', event.message);

        if (!message.length) {
          return;
        }
        const element = (message[0] as TextElem);
        callback(element);
        this.bot.off('message', listen);
      }
    };
    this.bot.on('message', listen);
  }

  nextImage(user_id: number, callback: (message: ImageElem) => any) {
    const listen = (event: AllMessageEvent) => {
      if (event.sender.user_id === user_id) {
        const message = this.parseMessage('image', event.message);

        if (!message.length) {
          return;
        }
        const element = (message[0] as ImageElem);
        callback(element);
        this.bot.off('message', listen);
      }
    };
    this.bot.on('message', listen);
  }

  parseMessage(type: ScannerType, message: MessageElem[]): MessageElem[] {
    switch (type) {
      case '': message.length = 1; break;
      case 'text': message = message.filter(i => i.type === 'text'); break;
      case 'image': message = message.filter(i => i.type === 'image' || i.type === 'flash'); break;
    }
    return message;
  }
}

/**
 * 校验 uin 合法性
 * 
 * @param {number} uin - 用户账号
 * @returns {boolean}
 */
export function checkUin(uin: number): boolean {
  return /[1-9][0-9]{4,10}/.test(uin.toString());
}

/**
 * 获取调用栈
 * 
 * @returns {Array}
 */
export function getStack(): NodeJS.CallSite[] {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;

  const stack: NodeJS.CallSite[] = new Error().stack as any;

  Error.prepareStackTrace = orig;
  return stack;
};

/**
 * 相同类型的对象深合并
 * 
 * @param {object} target - 目标 object
 * @param {object} sources - 源 object
 * @returns {object}
 */
export function deepMerge<T>(target: T, sources: T | undefined): T {
  const keys = Object.keys(sources ?? {});
  const keys_length = keys.length;

  for (let i = 0; i < keys_length; i++) {
    const key = keys[i];

    (<any>target)[key] = typeof (<any>target)[key] === 'object'
      ? deepMerge((<any>target)[key], (<any>sources)[key])
      : (<any>sources)[key];
  }
  return target;
}

/**
 * 对象深拷贝
 * 
 * @param {object} object - 拷贝 object
 * @returns {object}
 */
export function deepClone<T>(object: T): T {
  return JSON.parse(JSON.stringify(object))
}
