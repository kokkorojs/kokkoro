/**
 * 防抖函数
 *
 * @param func - 函数
 * @param timeout - 防抖延迟
 * @param leading - 在延迟开始前调用函数
 */
export function debounce<T extends (...args: any[]) => any>(
  this: unknown,
  func: T,
  timeout: number = 300,
  leading: boolean = false
): any {
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
      timer = setTimeout(() => (timer = undefined), timeout);
    };
  }
}
