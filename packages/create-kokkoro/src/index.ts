#!/usr/bin/env bun

import { argv } from 'bun';

import { input } from 'komut/prompts';

import { createProject } from './project';

const name = input('项目名称', { default: 'kokkoro-app' });

if (name === null) {
  throw new Error('已取消创建项目');
}
const isForced = argv.includes('--force') || argv.includes('-f');

await createProject(name, isForced);
