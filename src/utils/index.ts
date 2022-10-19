import { Logger, getLogger } from 'log4js';

export const logger: Logger = getLogger('[kokkoro]');
logger.level = 'all';

/**
 * 校验 uin 合法性
 * 
 * @param uin - 用户账号
 * @returns qq 号是否合法
 */
export function checkUin(uin: number): boolean {
  return /[1-9][0-9]{4,10}/.test(uin.toString());
}

/**
 * 获取调用栈
 * 
 * @returns 函数调用栈信息
 */
export function getStack(): NodeJS.CallSite[] {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;

  const stack: NodeJS.CallSite[] = new Error().stack as any;

  Error.prepareStackTrace = orig;
  return stack;
}

/**
 * 相同类型的对象深合并
 * 
 * @param target - 目标 object
 * @param sources - 源 object
 * @returns 合并后的对象
 */
export function deepMerge<T, K extends keyof T>(target: T, sources: any = {}): T {
  const keys = <K[]>Object.keys(sources);
  const keys_length: number = keys.length;

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
  return !!object ? JSON.parse(JSON.stringify(object)) : {};
}

/**
 * 深度代理
 * 
 * @param target - 代理对象
 * @param handler - 处理函数
 * @returns 
 */
export function deepProxy<T extends { [key: string]: any }>(target: T, handler: ProxyHandler<T>): T {
  if (typeof target === 'object') {
    const keys = Object.keys(target);
    const keys_length = keys.length;

    for (let i = 0; i < keys_length; i++) {
      const key = keys[i];

      if (typeof target[key] === 'object') {
        (<object>target[key]) = deepProxy(<object>target[key], handler);
      }
    }
  }
  return new Proxy(target, handler);
}

export { debounce } from '@/utils/debounce';
export { throttle } from '@/utils/throttle';
