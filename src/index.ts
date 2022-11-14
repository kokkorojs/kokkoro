import { join } from 'path';

declare global {
  /** 当前进程目录 */
  var __workname: string;
  /** 当前资源目录 */
  var __dataname: string;
}

global.__workname = process.cwd();
global.__dataname = join(__workname, 'data');

const { upday, version, changelogs } = require('../package.json');

export const UPDAY: string = upday;
export const VERSION: string = version;
export const CHANGELOGS: string = changelogs;

export * from '@/core';
export * from '@/config';
export * from '@/plugin';
export * from '@/worker';
