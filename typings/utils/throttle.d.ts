interface Option {
    leading: boolean;
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
export declare function throttle<T extends (...args: any[]) => any>(func: T, wait: number, options?: Option): {
    (this: any, ...args: unknown[]): ReturnType<T>;
    cancel: () => void;
    flush: () => ReturnType<T>;
    pending: () => boolean;
};
export {};
