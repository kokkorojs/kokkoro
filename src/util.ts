import axios from 'axios';
import { getLogger, Logger } from 'log4js';
import { AtElem, FlashElem, ImageElem, segment, DiscussMessageEvent, GroupMessageEvent, PrivateMessageEvent, GroupRole } from 'oicq';
import { Bot } from './bot';

import { setKokkoroConfig } from './config';

export const section = {
  image, at: segment.at,
};

export const logger: Logger = getLogger('[kokkoro log]');
logger.level = 'all';

export const colors = {
  red: colorful(31), green: colorful(32), yellow: colorful(33),
  blue: colorful(34), magenta: colorful(35), cyan: colorful(36), white: colorful(37),
};

/**
 * 控制台彩色打印
 * 
 * @param {number} code - ANSI escape code
 * @returns {Function} 
 */
function colorful(code: number): Function {
  return (msg: string) => `\u001b[${code}m${msg}\u001b[0m`
}

/**
 * 生成图片消息段（oicq 无法 catch 网络图片下载失败，所以单独处理）
 * 
 * @param {string} url - 图片 url
 * @param {boolean} flash - 是否生成闪图
 * @returns {Promise} 
 */
function image(url: string, flash: boolean = false): Promise<ImageElem | FlashElem | string> {
  return new Promise((resolve, reject) => {
    // 判断是否为网络链接
    if (!/^https?/g.test(url)) return resolve(!flash ? segment.image(`file:///${url}`) : segment.flash(`file:///${url}`));

    axios.get(url, { responseType: 'arraybuffer', timeout: 5000, })
      .then((response) => {
        resolve(!flash ? segment.image(response.data) : segment.flash(response.data));
      })
      .catch((error: Error) => {
        reject(new Error(`Error: ${error.message}\n图片下载失败，地址:\n${url}`));
      })
  })
}

/**
 * 校验指令
 *
 * @param {Object} command - 指令对象
 * @param {string} raw_message - 收到的消息
 * @returns {string|undefined} 返回 command 对象匹配的方法名
 */
function checkCommand(command: { [key: string]: RegExp }, raw_message: string) {
  const keys = Object.keys(command);
  const key_length = keys.length;

  for (let i = 0; i < key_length; i++) {
    const key = keys[i];

    if (!command[key].test(raw_message)) continue

    return key
  }
}

/**
 * 获取调用栈
 * 
 * @returns {Array}
 */
export function getStack() {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;

  const stack: NodeJS.CallSite[] = new Error().stack as any;

  Error.prepareStackTrace = orig;
  return stack;
};