import { resolve } from 'path';
import { LogLevel } from 'oicq';
import { deepClone } from '@kokkoro/utils';

import { logger } from '@/kokkoro';
import { BotConfig } from '@/core';

/** 全局配置 */
export type GlobalConfig = {
  /** 自定义变量 */
  env: {
    [key: string]: string;
  };
  /** 服务端口 */
  port: number;
  /** 日志等级，打印日志会降低性能，若消息量巨大建议修改此参数 */
  log_level: LogLevel;
  /** bot 信息 */
  bots: {
    /** uin 账号 */
    [uin: number]: BotConfig;
  };
};

const config_path: string = resolve('kokkoro.json');
const config: GlobalConfig = require(config_path);

logger.level = getConfig('log_level');

export function getConfig<T extends keyof GlobalConfig>(key: T): GlobalConfig[T] {
  return deepClone(config[key]);
}

export * from '@/config/profile';
