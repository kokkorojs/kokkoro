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

test('Command 输入处理', async () => {
  const bot = createBot();
  const replies: CommandReply[] = [];

  function setup() {
    useCommand('/echo <part>', context => context.args.part);
  }

  await bot.mount(setup);
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/missing', replies));
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/echo', replies));
  await bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/echo hello world', replies));
  await bot.emit(
    'GROUP_MESSAGE_CREATE',
    createMessageEvent('<@BOT_OPENID> /echo mention', replies, [{ id: 'BOT_OPENID', is_you: true }]),
  );
  await bot.emit(
    'GROUP_MESSAGE_CREATE',
    createMessageEvent('<@OTHER_OPENID> /echo ignored', replies, [{ id: 'OTHER_OPENID' }]),
  );

  expect(replies).toEqual(['/echo <part>', '缺少指令参数，有效语句为："/echo <part>"', 'hello', 'mention']);
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
    running++;

    if (running === 3) {
      started.resolve();
    }
    await gate.promise;
    running--;
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
      calls++;
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

test('Command 异常', async () => {
  const bot = createBot();
  const replies: CommandReply[] = [];
  const handlerError = new Error('指令处理失败');

  function setup() {
    useCommand('/error', () => {
      throw handlerError;
    });
    useCommand('/invalid', () => Promise.reject('invalid'));
  }

  await bot.mount(setup);
  await expect(bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/error', replies))).rejects.toBe(handlerError);
  await expect(bot.emit('GROUP_MESSAGE_CREATE', createMessageEvent('/invalid', replies))).rejects.toMatchObject({
    cause: 'invalid',
    message: 'Command handler must throw an Error',
    name: 'TypeError',
  });

  expect(replies).toEqual(['指令处理失败']);
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
