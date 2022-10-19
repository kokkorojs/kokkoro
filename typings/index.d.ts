declare global {
    /** 当前进程目录 */
    var __workname: string;
    /** 当前资源目录 */
    var __dataname: string;
}
export declare const UPDAY: string;
export declare const VERSION: string;
export declare const CHANGELOGS: string;
export { Profile } from '@/config';
export { runWorkerThreads } from '@/worker';
export { Plugin, PluginSetting } from '@/plugin';
