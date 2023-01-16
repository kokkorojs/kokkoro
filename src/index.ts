import { resolve } from 'path';
import { Logger, getLogger } from 'log4js';

interface Package {
  author: string;
  changelogs: string;
  license: string;
  upday: string;
  version: string;
}

declare global {
  /** 当前进程目录 */
  var __workname: string;
  /** 资源目录 */
  var __dataname: string;
  /** 数据库目录 */
  var __dbname: string;
}

global.__workname = process.cwd();
global.__dataname = resolve('data');
global.__dbname = resolve('db');

const { author, changelogs, license, upday, version } = require('../package.json') as Package;

export const AUTHOR = author;
export const CHANGELOGS = changelogs;
export const LICENSE = license;
export const UPDAY = upday;
export const VERSION = version;

export const logger: Logger = getLogger('[kokkoro]');

export * from 'oicq';
