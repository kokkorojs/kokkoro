import { getLogger, Logger } from 'log4js';
import axios, { AxiosRequestConfig } from 'axios';
import { FlashElem, ImageElem, segment } from 'oicq';

export const section = {
  image, at: segment.at,
};

export const logger: Logger = getLogger('[kokkoro:notify]');
logger.level = 'all';

// export const colors = {
//   red: colorful(31), green: colorful(32), yellow: colorful(33),
//   blue: colorful(34), magenta: colorful(35), cyan: colorful(36), white: colorful(37),
// };

// /**
//  * 控制台彩色打印
//  * 
//  * @param {number} code - ANSI escape code
//  * @returns {Function} 
//  */
// function colorful(code: number): Function {
//   return (msg: string) => `\u001b[${code}m${msg}\u001b[0m`;
// }

/**
 * 生成图片消息段（oicq 无法 catch 网络图片下载失败，所以单独处理）
 * 
 * @param {string} data - 图片数据
 * @param {boolean} flash - 是否生成闪图
 * @returns {ImageElem|FlashElem|string} 
 */
function image(data: string | Buffer, flash: boolean = false): ImageElem | FlashElem | string {
  let element: string | Buffer = '';

  if (data instanceof Buffer) {
    element = data;
  } else if (!/^https?/g.test(data)) {
    element = `file:///${data}`;
  } else {
    const config: AxiosRequestConfig<any> = { responseType: 'arraybuffer', timeout: 5000, };

    (async () => {
      try {
        element = (await axios.get(data, config)).data;
      } catch (error) {
        const { message } = error as Error;

        logger.error(message);
        return `Error: ${message}\n${data}`;
      }
    })();
  }

  return !flash ? segment.image(element) : segment.flash(element);
}

/**
 * 获取调用栈
 * 
 * @returns {Array}
 */
function getStack(): NodeJS.CallSite[] {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;

  const stack: NodeJS.CallSite[] = new Error().stack as any;

  Error.prepareStackTrace = orig;
  return stack;
};

/**
 * 对象深合并
 * 
 * @param {object} target - 目标 object
 * @param {object} sources - 源 object
 * @returns {object}
 */
export function deepMerge(target: any, sources: any = {}): any {
  const keys = Object.keys(sources);
  const keys_length = keys.length;

  for (let i = 0; i < keys_length; i++) {
    const key = keys[i];

    target[key] = typeof target[key] === 'object'
      ? deepMerge(target[key], sources[key])
      : sources[key];
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
