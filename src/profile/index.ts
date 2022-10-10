import { resolve } from 'path';

import '@/kokkoro';
import { BotConfig } from '@/core';

/** kokkoro 全局配置 */
export type Profile = {
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

const profile_path = resolve(__workname, 'kokkoro.json');
const profile = <Profile>require(profile_path);

export function getProfile<T extends keyof Profile>(key: T): Profile[T] {
  return profile[key];
}
