import { expect, test } from 'bun:test';

import { type Command, type CommandReply, useCommand, useEvent } from '@kokkoro/core';

import { createBot, createMessageEvent } from './helpers';

test('Command 参数', async () => {
  const bot = createBot();
  const args: unknown[] = [];

  function setup() {
    useCommand('/search <keyword> [page] [tags]...', context => {
      args.push(context.args);
    });
  }

  await bot.mount(setup);
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('  /search kokkoro 2 bot qq'));
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/search bun'));

  expect(args).toEqual([
    { keyword: 'kokkoro', page: '2', tags: ['bot', 'qq'] },
    { keyword: 'bun', page: undefined, tags: [] },
  ]);
});

test('Command 分词', async () => {
  const bot = createBot();
  let values: string[] = [];

  function setup() {
    useCommand('/say <values>...', context => {
      values = context.args.values;
    });
  }

  await bot.mount(setup);
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/say "hello world" \\path'));

  expect(values).toEqual(['"hello', 'world"', '\\path']);
});

test('Command 错误提示', async () => {
  const bot = createBot();
  const replies: CommandReply[] = [];

  function setup() {
    useCommand('/weather <city>', () => undefined);
    useCommand('/setu [tag]', () => undefined);
  }

  await bot.mount(setup);
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/missing', replies));
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/weather', replies));
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/setu one extra', replies));

  expect(replies).toEqual(['/weather <city>\n/setu [tag]', '/weather <city>', '/setu [tag]']);
});

test('Shortcut 匹配', async () => {
  const bot = createBot();
  const args: unknown[] = [];

  function setup() {
    useCommand('/setu [tag] [tags]...', context => {
      args.push(context.args);
    })
      .shortcut('来点涩图')
      .shortcut(/^来点(?<tag>.+)单图$/)
      .shortcut(/^来点(?<tags>.+)涩图$/);
  }

  await bot.mount(setup);
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('没有命中'));
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('来点涩图'));
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('来点可可萝单图'));
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('来点可可萝、萝莉涩图'));

  expect(args).toEqual([
    { tag: undefined, tags: [] },
    { tag: '可可萝', tags: [] },
    { tag: undefined, tags: ['可可萝、萝莉'] },
  ]);
});

test('Shortcut 并发', async () => {
  const bot = createBot();
  const gate = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  let running = 0;

  async function handler() {
    running += 1;

    if (running === 3) {
      started.resolve();
    }
    await gate.promise;
    running -= 1;
  }

  function setup() {
    useCommand('/first', handler)
      .shortcut('hello')
      .shortcut(/^hello$/);
    useCommand('/second', handler).shortcut('hello');
  }

  await bot.mount(setup);
  const dispatch = bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('hello'));

  await started.promise;
  expect(running).toBe(3);

  gate.resolve();
  await dispatch;
});

test('Command 前缀冲突', async () => {
  const first = createBot();
  const second = createBot();

  function setup() {
    useCommand('/same <value>', () => undefined);
    useCommand('/same [value]', () => undefined);
  }

  await expect(first.mount(setup)).rejects.toThrow('Command prefix is already mounted: /same');

  function otherSetup() {
    useCommand('/same', () => undefined);
  }

  await first.mount(otherSetup);
  await second.mount(otherSetup);
});

test('Command 并发挂载', async () => {
  const bot = createBot();
  const gate = Promise.withResolvers<void>();

  function firstSetup() {
    useEvent(async () => {
      await gate.promise;
    }, []);
    useCommand('/same', () => 'first');
  }

  function secondSetup() {
    useCommand('/same', () => 'second');
  }

  const firstMount = bot.mount(firstSetup);
  const secondMount = bot.mount(secondSetup);

  gate.resolve();
  const [firstResult, secondResult] = await Promise.allSettled([firstMount, secondMount]);

  expect(firstResult.status).toBe('fulfilled');
  expect(secondResult).toMatchObject({
    reason: new Error('Command prefix is already mounted: /same'),
    status: 'rejected',
  });

  await bot.unmount(firstSetup);
});

test('Command 生命周期', async () => {
  const bot = createBot();
  const mountGate = Promise.withResolvers<void>();
  const handlerGate = Promise.withResolvers<void>();
  const handlerStarted = Promise.withResolvers<void>();
  let calls = 0;

  function setup() {
    useEvent(async () => {
      await mountGate.promise;
    }, []);
    useCommand('/wait', async () => {
      calls += 1;
      handlerStarted.resolve();
      await handlerGate.promise;
    });
  }

  const mount = bot.mount(setup);
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/wait'));
  expect(calls).toBe(0);

  mountGate.resolve();
  await mount;

  const dispatch = bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/wait'));
  await handlerStarted.promise;
  expect(calls).toBe(1);

  const unmount = bot.unmount(setup);
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/wait'));
  expect(calls).toBe(1);

  handlerGate.resolve();
  await Promise.all([dispatch, unmount]);
});

test('Command 回复', async () => {
  const bot = createBot();
  const replies: CommandReply[] = [];

  function setup() {
    useCommand('/text', () => 'hello');
    useCommand('/object', () => ({ msg_type: 0, content: 'payload' }));
    useCommand('/record', () => ({ key: 'value' }));
    useCommand('/array', () => []);
    useCommand('/explicit', async context => {
      await context.reply('manual');
    });
  }

  await bot.mount(setup);
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/text', replies));
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/object', replies));
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/record', replies));
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/array', replies));
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/explicit', replies));

  expect(replies).toEqual(['hello', { msg_type: 0, content: 'payload' }, '{"key":"value"}', '[]', 'manual']);
});

test('Command 注册时机', async () => {
  const bot = createBot();
  let command: Command | undefined;

  expect(() => useCommand('/outside', () => undefined)).toThrow('Hooks can only be called while mounting a plugin');

  function setup() {
    command = useCommand('/hello', () => undefined);
  }

  await bot.mount(setup);
  expect(() => command?.shortcut('hello')).toThrow('Command shortcuts can only be registered while mounting a plugin');
});

test('Command 参数语法', async () => {
  const register = <(syntax: string, handler: () => undefined) => unknown>(<unknown>useCommand);

  const cases = [
    ['/invalid [optional] <required>', 'Required Command parameters must precede optional parameters'],
    ['/invalid <value> [value]', 'Duplicate Command parameter: value'],
    ['/invalid <values>... [other]', 'A variadic Command parameter must be last'],
    [' /hello', 'Command syntax must start with /'],
  ] as const;

  for (const [syntax, message] of cases) {
    const bot = createBot();

    await expect(
      bot.mount(() => {
        register(syntax, () => undefined);
      }),
    ).rejects.toThrow(message);
  }
});
