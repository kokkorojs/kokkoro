import { getLogger } from 'log4js';

interface Package {
  author: string;
  changelogs: string;
  license: string;
  upday: string;
  version: string;
}

const { author, changelogs, license, upday, version } = require('../package.json') as Package;

export const AUTHOR = author;
export const CHANGELOGS = changelogs;
export const LICENSE = license;
export const UPDAY = upday;
export const VERSION = version;

export const logger = getLogger('[kokkoro]');

export * from 'oicq';
export * from '@/core';
export * from '@/config';
export * from '@/plugin';
