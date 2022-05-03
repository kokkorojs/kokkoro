import axios from 'axios';
import { segment as message } from 'oicq';
import { EventEmitter } from 'events';
import { getLogger, Logger } from 'log4js';

export const emitter = new EventEmitter();
export const logger: Logger = getLogger('[kokkoro]');
logger.level = 'all';

export const segment = { ...message, };

function image() {

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
