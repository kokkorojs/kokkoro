import { debounce } from './debounce';

interface Option {
  // 指定调用在节流开始前
  leading: boolean;
  // 指定调用在节流结束后
  trailing: boolean;
}

/**
 * 节流函数
 * 
 * @param func - 要节流的函数
 * @param wait - 需要节流的毫秒
 * @param options - 选项对象
 * @returns 返回节流的函数
 */
export function throttle<T extends (...args: unknown[]) => any>(func: T, wait: number, options?: Option) {
  let leading = true;
  let trailing = true;

  if (typeof func !== 'function') {
    throw new TypeError('Expected a function');
  }
  if (typeof options === 'object') {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }
  return debounce(func, wait, {
    leading,
    trailing,
    'maxWait': wait,
  })
}
