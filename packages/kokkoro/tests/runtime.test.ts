import { afterEach, expect, mock, spyOn, test } from 'bun:test';

import { Bot } from '@kokkoro/core';
import { Journal, LevelError } from 'annal';

import { type ResolvedBotConfig, type ResolvedConfig, type ServerConfig } from '../src/config';
import { createInstance, createRoutes, launch } from '../src/runtime';

import { events } from './fixtures/runtime/plugins/example/state';

const botConfig: ResolvedBotConfig = {
  appId: 'APP_ID',
  clientSecret: 'CLIENT_SECRET',
  protocol: 'websocket',
};
const serverConfig = { port: 0 } satisfies ServerConfig;

afterEach(() => {
  mock.restore();
});

test('机器人事件日志', async () => {
  const info = spyOn(console, 'info').mockImplementation(() => {});
  const { bot } = createInstance(botConfig, new Journal({ scope: 'kokkoro' }));

  await bot.emit('READY', {
    version: 1,
    session_id: 'SESSION_ID',
    user: { id: 'BOT_ID', username: 'Kokkoro', bot: true, status: 1 },
    shard: [0, 1],
  });
  await bot.emit('GROUP_MEMBER_ADD', {
    timestamp: 0,
    group_openid: 'GROUP_OPENID',
    member_openid: 'MEMBER_OPENID',
  });
  const output = info.mock.calls.flat().join(' ');

  expect(output).toContain('已连接');
  expect(output).toContain('Kokkoro');
  expect(output).toContain('群成员已加入');
});

test('事件处理异常日志', async () => {
  const error = spyOn(console, 'error').mockImplementation(() => {});
  const use = spyOn(Bot.prototype, 'use');

  createInstance(botConfig, new Journal({ scope: 'kokkoro' }));
  const [call] = use.mock.calls;

  if (!call) {
    throw new Error('未调用事件中间件注册方法');
  }
  const [middleware] = call;

  if (!middleware) {
    throw new Error('未注册事件中间件');
  }
  await middleware({ payload: { op: 0, t: 'RESUMED', d: '' }, state: {} }, async () => {
    throw new Error('插件执行失败');
  });
  const output = error.mock.calls.flat().join(' ');

  expect(output).toContain('事件处理失败');
  expect(output).toContain('Error: 插件执行失败');
});

test('HTTP 路由', async () => {
  const logger = new Journal({ scope: 'kokkoro' });
  const first = createInstance({ ...botConfig, protocol: 'webhook', webhook: { path: '/' } }, logger);
  const second = createInstance(
    { ...botConfig, appId: 'SECOND_APP_ID', protocol: 'webhook', webhook: { path: '/second' } },
    logger,
  );
  const firstCallback = spyOn(first.bot, 'callback').mockResolvedValue(new Response('first'));
  const secondCallback = spyOn(second.bot, 'callback').mockResolvedValue(new Response('second'));
  const routes = createRoutes(
    new Map([
      ['/', first],
      ['/second', second],
    ]),
  );
  const home = routes['/'];
  const secondRoute = routes['/second'];

  if (!home?.GET || !home.POST || !secondRoute?.POST) {
    throw new Error('HTTP 路由未创建');
  }
  const firstResponse = await home.POST(new Request('https://example.com/', { method: 'POST' }));
  const secondResponse = await secondRoute.POST(new Request('https://example.com/second', { method: 'POST' }));

  expect(await home.GET.text()).toBe('Ciallo～(∠·ω< )⌒★');
  expect(await firstResponse.text()).toBe('first');
  expect(await secondResponse.text()).toBe('second');
  expect(firstCallback).toHaveBeenCalledTimes(1);
  expect(secondCallback).toHaveBeenCalledTimes(1);
});

test('WebHook 路径冲突', async () => {
  const config: ResolvedConfig = {
    server: serverConfig,
    logger: { level: 'info' },
    bots: [
      { ...botConfig, protocol: 'webhook', webhook: { path: '/webhook' } },
      { ...botConfig, appId: 'SECOND_APP_ID', protocol: 'webhook', webhook: { path: '/webhook' } },
    ],
  };

  events.length = 0;
  await expect(
    launch(config, new Journal({ scope: 'kokkoro' }), `${import.meta.dir}/fixtures/runtime`),
  ).rejects.toThrow('WebHook 路径 /webhook 重复');
  expect(events).toEqual([]);
});

test('插件清理异常日志', async () => {
  const error = spyOn(console, 'error').mockImplementation(() => {});
  const logger = new Journal({ scope: 'kokkoro', level: LevelError });
  const config: ResolvedConfig = {
    server: serverConfig,
    logger: { level: 'error' },
    bots: [{ ...botConfig, protocol: 'webhook', webhook: { path: '/webhook' } }],
  };

  spyOn(logger, 'info').mockImplementation(() => {
    throw new Error('启动失败');
  });
  events.length = 0;
  await expect(launch(config, logger, `${import.meta.dir}/fixtures/runtime`)).rejects.toThrow(
    'Kokkoro 启动失败且回滚未完成',
  );
  const output = error.mock.calls.flat().join(' ');

  expect(events).toEqual(['import', 'render', 'cleanup', 'dispose']);
  expect(error).toHaveBeenCalledTimes(2);
  expect(output).toContain('取消挂载失败');
  expect(output).toContain('example Error: 取消挂载失败');
  expect(output).toContain('释放失败');
  expect(output).toContain('example Error: 释放失败');
});
