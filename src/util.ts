import axios from 'axios';
import { getLogger, Logger } from 'log4js';
import { AtElem, FlashElem, ImageElem, segment, DiscussMessageEvent, GroupMessageEvent, PrivateMessageEvent, GroupRole } from 'oicq';
import { Bot } from './bot';

import { getGlobalConfig } from './config';

// 维护组 QQ
const admin = [2225151531];

/**
 * @description 控制台彩色打印
 * @param code - ANSI escape code
 * @returns - function
 */
function colorful(code: number): Function {
  return (msg: string) => `\u001b[${code}m${msg}\u001b[0m`
}

export const colors = {
  red: colorful(31), green: colorful(32), yellow: colorful(33),
  blue: colorful(34), magenta: colorful(35), cyan: colorful(36), white: colorful(37),
};

/**
 * @description 生成图片消息段（oicq 无法 catch 网络图片下载失败，所以单独处理）
 * @param url - 图片 url
 * @param flash - 是否闪图
 * @returns - Promise
 */
function image(url: string, flash: boolean = false): Promise<ImageElem | FlashElem | string> {
  return new Promise((resolve, reject) => {
    // 判断是否为网络链接
    if (!/^https?/g.test(url)) return resolve(!flash ? segment.image(`file:///${url}`) : segment.flash(`file:///${url}`));

    axios.get(url, { responseType: 'arraybuffer', timeout: 5000, })
      .then((response: any) => {
        const image_base64: string = `base64://${Buffer.from(response.data, 'binary').toString('base64')}`;

        resolve(!flash ? segment.image(image_base64) : segment.flash(image_base64));
      })
      .catch((error: Error) => {
        reject(new Error(`Error: ${error.message}\n图片下载失败，地址:\n${url}`));
      })
  })
}

const section = {
  image, at: segment.at,
};

// log4js
export const logger: Logger = getLogger('[kokkoro log]');
logger.level = 'all';

/**
 * 校验指令
 *
 * @param command - 指令对象
 * @param raw_message - 收到的消息
 * @returns - 返回 command 对象匹配的方法名
 */
function checkCommand(command: { [key: string]: RegExp }, raw_message: string): string | undefined {
  const keys = Object.keys(command);
  const key_length = keys.length;

  for (let i = 0; i < key_length; i++) {
    const key = keys[i];

    if (!command[key].test(raw_message)) continue

    return key
  }
}

/**
 * @description 获取调用栈
 * @returns - Array
 */
export function getStack() {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;

  const stack: NodeJS.CallSite[] = new Error().stack as any;

  Error.prepareStackTrace = orig;
  return stack;
};