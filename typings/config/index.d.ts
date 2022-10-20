import '../index';
import { BotConfig } from '../core';
/** kokkoro 全局配置 */
export declare type GlobalConfig = {
    /** 第三方 key */
    api_key: {
        [api: string]: string;
    };
    /** 服务端口 */
    port: number;
    /** bot 信息 */
    bots: {
        /** uin 账号 */
        [uin: number]: BotConfig;
    };
};
export declare function getConfig<T extends keyof GlobalConfig>(key: T): GlobalConfig[T];
export { Profile, UpdateSettingEvent } from '../config/profile';
