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
export declare function debounce<T extends (...args: any) => any>(func: T, wait: number, options?: DebounceOption): {
    (this: any, ...args: unknown[]): ReturnType<T>;
    cancel: () => void;
    flush: () => ReturnType<T>;
    pending: () => boolean;
};
export {};
