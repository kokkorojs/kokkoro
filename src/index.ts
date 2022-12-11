import { resolve } from 'path';
import { Logger, getLogger } from 'log4js';

declare global {
  /** 当前进程目录 */
  var __workname: string;
  /** 当前资源目录 */
  var __dataname: string;
}

global.__workname = process.cwd();
global.__dataname = resolve('data');

export const logger: Logger = getLogger('[kokkoro]');

const { upday, version, changelogs } = require('../package.json');

export const UPDAY: string = upday;
export const VERSION: string = version;
export const CHANGELOGS: string = changelogs;

export * from '@/core';
export * from '@/config';
export * from '@/events';
export * from '@/plugin';
