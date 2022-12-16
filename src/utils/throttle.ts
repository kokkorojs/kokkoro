/**
 * 节流函数
 *
 * @param func - 函数
 * @param timeout - 节流延迟
 */
export function throttle(this: any, func: Function, timeout: number = 300) {
  let flag = true;

  return (...args: any[]) => {
    if (flag) {
      func.apply(this, args);
      flag = false;
      setTimeout(() => (flag = true), timeout);
    }
  };
}
