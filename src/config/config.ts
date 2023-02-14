import { LogLevel } from 'oicq';
import { deepClone } from '@kokkoro/utils';
import { BotConfig } from '@/core';

export interface Package {
  name: string;
  author: string;
  changelogs: string;
  license: string;
  upday: string;
  version: string;
}

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

const pkg = require('../package.json') as Package;
const config = require('kokkoro.json') as KokkoroConfig;

/**
 * 获取配置项信息
 * 
 * @param key - 配置项键值，不传则返回所有
 * @returns 配置项信息
 */
export function getConfig(): KokkoroConfig;
export function getConfig<T extends keyof KokkoroConfig>(key: T): KokkoroConfig[T];
export function getConfig<T extends keyof KokkoroConfig>(key?: T): KokkoroConfig[T] | KokkoroConfig {
  return deepClone(key ? config[key] : config);
}

/**
 * 获取 kokkoro 包信息
 * 
 * @param key - 包键值，不传则返回所有
 * @returns 包信息
 */
export function getPackage(): Package;
export function getPackage<T extends keyof Package>(key: T): Package[T];
export function getPackage<T extends keyof Package>(key?: T): Package | Package[T] {
  return deepClone(key ? pkg[key] : pkg);
}
