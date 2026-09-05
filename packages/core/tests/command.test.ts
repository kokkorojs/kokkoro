import { expect, test } from 'bun:test';

import { type ClientEvent, type Command, type CommandTrigger, useCommand, useEvent } from '@kokkoro/core';

import { createBot, createGroupMessageEvent } from './helpers';

test('Command 参数', async () => {
  const bot = createBot();
  const args: unknown[] = [];

  function setup() {
    useCommand('/search <keyword> [page] [tags]...', context => {
      args.push(context.args);
    });
  }

  await bot.mount(setup);
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('  /search\tkokkoro　2 bot qq'));
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/search bun'));

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
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/say "hello world" \\path'));

  expect(values).toEqual(['"hello', 'world"', '\\path']);
});

test('Command 输入处理', async () => {
  const bot = createBot();
  const replies: unknown[] = [];

  function setup() {
    useCommand('/echo <part>', context => context.args.part);
  }

  await bot.mount(setup);
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/missing', replies));
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/echo', replies));
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/echo hello world', replies));
  await bot.emit(
    'GROUP_MESSAGE_CREATE',
    createGroupMessageEvent('<@BOT_OPENID> /echo mention', replies, [{ id: 'BOT_OPENID', is_you: true }]),
  );
  await bot.emit(
    'GROUP_MESSAGE_CREATE',
    createGroupMessageEvent('<@OTHER_OPENID> /echo ignored', replies, [{ id: 'OTHER_OPENID' }]),
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
      .shortcut('来点涩图.')
      .shortcut(/^来点(?<tag>.+)单图$/)
      .shortcut(/^来点(?<tags>.+)涩图$/);
  }

  await bot.mount(setup);
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('来点涩图x'));
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('来点涩图'));
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('  来点涩图 \t'));
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('来点涩图.\n'));
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('来点可可萝单图'));
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('来点可可萝、萝莉涩图'));

  expect(args).toEqual([
    { tag: undefined, tags: [] },
    { tag: undefined, tags: [] },
    { tag: undefined, tags: [] },
    { tag: '可可萝', tags: [] },
    { tag: undefined, tags: ['可可萝、萝莉'] },
  ]);
});

test('Shortcut 必填参数', async () => {
  const patterns = ['required', /^required .+$/] as const;

  for (const pattern of patterns) {
    const bot = createBot();

    await expect(
      bot.mount(() => {
        useCommand('/required <value>', () => undefined).shortcut(pattern);
      }),
    ).rejects.toThrow('Command shortcut is missing required parameters: value');
  }

  const bot = createBot();
  const args: string[] = [];

  await expect(
    bot.mount(() => {
      useCommand('/required <value>', context => {
        args.push(context.args.value);
      }).shortcut(/^required(?: (?<value>.*))?$/);
    }),
  ).resolves.toBeUndefined();

  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('required'));
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('required '));
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('required value'));

  expect(args).toEqual(['value']);
});

test('Shortcut 原型同名参数', async () => {
  for (const pattern of ['example', /^example$/]) {
    const bot = createBot();
    const args: unknown[] = [];

    await bot.mount(() => {
      useCommand('/example [constructor] [__proto__]', context => {
        args.push(context.args);
      }).shortcut(pattern);
    });
    await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('example'));

    expect(args).toEqual([{ constructor: undefined, ['__proto__']: undefined }]);
  }
});

test('Shortcut 并发', async () => {
  const bot = createBot();
  const gate = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  let activeCount = 0;

  async function handler() {
    activeCount++;

    if (activeCount === 3) {
      started.resolve();
    }
    await gate.promise;
    activeCount--;
  }

  function setup() {
    useCommand('/first', handler)
      .shortcut('hello')
      .shortcut(/^hello$/);
    useCommand('/second', handler).shortcut('hello');
  }

  await bot.mount(setup);
  const dispatch = bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('hello'));

  await started.promise;
  expect(activeCount).toBe(3);

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
  let callCount = 0;

  function setup() {
    useEvent(async () => {
      await mountGate.promise;
    }, []);
    useCommand('/wait', async () => {
      callCount++;
      handlerStarted.resolve();
      await handlerGate.promise;
    });
  }

  const mounting = bot.mount(setup);
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/wait'));
  expect(callCount).toBe(0);

  mountGate.resolve();
  await mounting;

  const dispatch = bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/wait'));
  await handlerStarted.promise;
  expect(callCount).toBe(1);

  const unmounting = bot.unmount(setup);
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/wait'));
  expect(callCount).toBe(1);

  handlerGate.resolve();
  await Promise.all([dispatch, unmounting]);
});

test('Command 回复', async () => {
  const bot = createBot();
  const replies: unknown[] = [];

  function setup() {
    useCommand('/text', () => 'hello');
    useCommand('/object', () => ({ msg_type: 0, content: 'payload' }));
    useCommand('/record', () => ({ key: 'value' }));
    useCommand('/array', () => []);
    useCommand('/explicit', async context => {
      await context.reply({ content: 'manual' });
    });
  }

  await bot.mount(setup);
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/text', replies));
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/object', replies));
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/record', replies));
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/array', replies));
  await bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/explicit', replies));

  expect(replies).toEqual([
    'hello',
    '{"msg_type":0,"content":"payload"}',
    '{"key":"value"}',
    '[]',
    { content: 'manual' },
  ]);
});

test('Command 异常', async () => {
  const bot = createBot();
  const replies: unknown[] = [];
  const triggers: CommandTrigger[] = [];
  const handlerError = new Error('指令处理失败');

  function setup() {
    useCommand('/error', context => {
      triggers.push(context.trigger);
      throw handlerError;
    }).shortcut('快捷失败');
    useCommand('/invalid', () => Promise.reject('invalid'));
  }

  await bot.mount(setup);
  await expect(bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/error', replies))).rejects.toBe(handlerError);
  await expect(bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('快捷失败', replies))).rejects.toBe(
    handlerError,
  );
  await expect(bot.emit('GROUP_MESSAGE_CREATE', createGroupMessageEvent('/invalid', replies))).rejects.toMatchObject({
    cause: 'invalid',
    message: 'Command handler must throw an Error',
    name: 'TypeError',
  });

  expect(replies).toEqual(['指令处理失败', '指令处理失败']);
  expect(triggers).toEqual(['command', 'shortcut']);
});

test('Command 异常回复失败', async () => {
  const bot = createBot();
  const handlerError = new Error('指令处理失败');
  const replyError = new Error('错误回复失败');

  function setup() {
    useCommand('/error', () => {
      throw handlerError;
    });
  }

  await bot.mount(setup);
  const event = <ClientEvent<'GROUP_MESSAGE_CREATE'>>(<unknown>{
    content: '/error',
    reply: () => Promise.reject(replyError),
  });

  await expect(bot.emit('GROUP_MESSAGE_CREATE', event)).rejects.toMatchObject({
    error: replyError,
    name: 'SuppressedError',
    suppressed: handlerError,
  });
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
