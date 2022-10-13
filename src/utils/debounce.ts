interface DebounceOption {
  /** 指定在延迟开始前调用 */
  leading: boolean;
  /** 设置 func 允许被延迟的最大值 */
  maxWait: number;
  /** 指定在延迟结束后调用 */
  trailing: boolean;
}

/**
 * 防抖函数
 * 
 * @param func - 要防抖动的函数
 * @param wait - 需要延迟的毫秒数
 * @param options - 选项对象
 * @returns 返回新的 debounced（防抖动）函数
 */
export function debounce<T extends (...args: any) => any>(func: T, wait: number, options?: DebounceOption) {
  let lastArgs: unknown[] | undefined;
  let lastThis: unknown;
  let maxWait: number;
  let result: ReturnType<T>;
  let timerId: number | undefined;
  let lastCallTime: number | undefined;

  let lastInvokeTime = 0;
  let leading = false;
  let maxing = false;
  let trailing = true;

  if (typeof func !== 'function') {
    throw new TypeError('Expected a function');
  }
  wait = +wait || 0;

  if (typeof options === 'object') {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    trailing = 'trailing' in options ? !!options.trailing : trailing;

    if (maxing) {
      maxWait = Math.max(+options.maxWait || 0, wait);
    }
  }

  function invokeFunc(time: number) {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, <any[]>args);
    return result;
  }

  function startTimer(pendingFunc: Function, wait: number): number {
    return setTimeout(pendingFunc, wait);
  }

  function cancelTimer(id: number) {
    clearTimeout(id);
  }

  function leadingEdge(time: number) {
    lastInvokeTime = time;
    timerId = startTimer(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number) {
    const timeSinceLastCall = time - lastCallTime!;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    return maxing
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - lastCallTime!;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    const time = Date.now();

    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timerId = startTimer(timerExpired, remainingWait(time));
  }

  function trailingEdge(time: number) {
    timerId = undefined;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      cancelTimer(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(Date.now());
  }

  function pending() {
    return timerId !== undefined;
  }

  function debounced(this: any, ...args: unknown[]) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        timerId = startTimer(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = startTimer(timerExpired, wait);
    }
    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced;
}
