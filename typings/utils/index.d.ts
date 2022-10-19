/// <reference types="node" />
import { Logger } from 'log4js';
export declare const logger: Logger;
/**
 * 校验 uin 合法性
 *
 * @param uin - 用户账号
 * @returns qq 号是否合法
 */
export declare function checkUin(uin: number): boolean;
/**
 * 获取调用栈
 *
 * @returns 函数调用栈信息
 */
export declare function getStack(): NodeJS.CallSite[];
/**
 * 相同类型的对象深合并
 *
 * @param target - 目标 object
 * @param sources - 源 object
 * @returns 合并后的对象
 */
export declare function deepMerge<T, K extends keyof T>(target: T, sources?: any): T;
/**
 * 对象深拷贝
 *
 * @param {object} object - 拷贝 object
 * @returns {object}
 */
export declare function deepClone<T>(object: T): T;
/**
 * 深度代理
 *
 * @param target - 代理对象
 * @param handler - 处理函数
 * @returns
 */
export declare function deepProxy<T extends {
    [key: string]: any;
}>(target: T, handler: ProxyHandler<T>): T;
export { debounce } from '@/utils/debounce';
export { throttle } from '@/utils/throttle';
