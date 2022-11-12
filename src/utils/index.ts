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

/**
 * 防抖函数
 * 
 * @param func - 函数
 * @param timeout - 防抖延迟
 * @param leading - 在延迟开始前调用函数
 */
export function debounce<T extends (...args: any[]) => any>(this: any, func: T, timeout: number = 300, leading: boolean = false): any {
  let timer: NodeJS.Timeout | undefined;

  if (!leading) {
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), timeout);
    };
  } else {
    return (...args: any[]) => {
      if (!timer) {
        func.apply(this, args);
      }
      clearTimeout(timer);
      timer = setTimeout(() => timer = undefined, timeout);
    };
  }
}

/**
 * 节流函数
 * 
 * @param func - 函数
 * @param timeout - 防抖延迟
 */
export function throttle(this: Function, func: Function, timeout: number = 300) {
  let flag = true;

  return (...args: any[]) => {
    if (flag) {
      func.apply(this, args);
      flag = false;
      setTimeout(() => flag = true, timeout);
    }
  }
}
