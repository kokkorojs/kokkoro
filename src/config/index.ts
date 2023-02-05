import { resolve } from 'path';
import { LogLevel } from 'oicq';
import { deepClone } from '@kokkoro/utils';
import { BotConfig } from '@/core';

declare global {
  /** 当前进程目录 */
  var __workname: string;
  /** 资源目录 */
  var __dataname: string;
  /** 数据库目录 */
  var __dbname: string;
  /** 日志目录 */
  var __logsname: string;
}

global.__workname = process.cwd();
global.__dataname = resolve('data');
global.__dbname = resolve('db');
global.__logsname = resolve('logs');

export type KokkoroConfig = {
  /** web 服务 */
  server: {
    port: number;
    domain: string;
  }
  /** 日志等级，打印日志会降低性能，若消息量巨大建议修改此参数 */
  log_level: LogLevel;
  /** bot 信息 */
  bots: BotConfig[];
};

const config_path: string = resolve('kokkoro.json');
const config: KokkoroConfig = require(config_path);

export function getConfig<T extends keyof KokkoroConfig>(key: T): KokkoroConfig[T] {
  return deepClone(config[key]);
}

export * from '@/config/database';
export * from '@/config/env';
export * from '@/config/logger';
export * from '@/config/profile';
