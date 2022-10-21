import { resolve } from 'path';

import '@/kokkoro';
import { BotConfig } from '@/core';

/** kokkoro 全局配置 */
export type GlobalConfig = {
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

const config_path: string = resolve(__workname, 'kokkoro.json');
const config: GlobalConfig = require(config_path);

export function getConfig<T extends keyof GlobalConfig>(key: T): GlobalConfig[T] {
  return config[key];
}

export { Profile, UpdateSettingEvent } from '@/config/profile';