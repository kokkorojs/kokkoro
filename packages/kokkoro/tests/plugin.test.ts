import { expect, test } from 'bun:test';

import { loadPlugin } from '@kokkoro/core';

import { findPlugins } from '../src/plugin';

import { events } from './fixtures/failure/plugins/example/state';

test('发现本地插件', async () => {
  const plugins = await findPlugins(`${import.meta.dir}/fixtures/runtime`);

  expect(plugins.map(plugin => plugin.name)).toEqual(['example']);
});

test('读取本地插件包名', async () => {
  const plugins = await findPlugins(`${import.meta.dir}/fixtures/failure`);

  expect(plugins.map(plugin => plugin.name)).toEqual(['kokkoro-plugin-failure']);
});

test('发现依赖插件', async () => {
  const plugins = await findPlugins(`${import.meta.dir}/fixtures`);

  expect(plugins.map(plugin => plugin.name)).toEqual(['kokkoro-plugin-example']);
});

test('拒绝重复插件名', async () => {
  await expect(findPlugins(`${import.meta.dir}/fixtures/duplicate`)).rejects.toThrow(
    '插件 kokkoro-plugin-example 重复',
  );
});

test('插件加载失败回滚', async () => {
  const [entry] = await findPlugins(`${import.meta.dir}/fixtures/failure`);

  if (!entry) {
    throw new Error('未找到插件');
  }
  events.length = 0;
  await expect(loadPlugin(entry.loader)).rejects.toThrow('加载失败');
  expect(events).toEqual(['import', 'dispose']);
});
