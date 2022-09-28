import { resolve } from 'path';
import { YAML } from '@kokkoro/utils';

import { Config } from '../bot';

// kokkoro 全局配置
export type Profile = {
  api_key: {
    [api: string]: string;
  };
  // 服务端口
  port: number;
  // bot 信息
  bots: {
    // uin 账号
    [uin: number]: Config;
  };
};

const profile_path = resolve(__workname, 'kokkoro.yml');
const profile = YAML.readSync(profile_path) as Profile;

export function getProfile<T extends keyof Profile>(key: T): Profile[T] {
  return profile[key];
}
