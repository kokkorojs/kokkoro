import { resolve } from 'path';
import { YAML } from '@kokkoro/utils';

import { Config } from "./bot";

// kokkoro 全局配置
export interface GlobalConfig {
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
}

const config_path = resolve(__workname, 'kokkoro.yml');
const global_config = YAML.readSync(config_path) as GlobalConfig;

export function getGlobalConfig<T extends keyof GlobalConfig>(key: T): GlobalConfig[T] {
  return global_config[key];
}
