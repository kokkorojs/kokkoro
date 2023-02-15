import { resolve } from 'path';

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

export * from 'oicq';

export * from '@/core';
export * from '@/config';
export * from '@/types';
export * from '@/plugin';
export * from '@/setup';
