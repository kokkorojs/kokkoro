import { expect, test } from 'bun:test';

import {
  type Bot,
  type Logger,
  type PluginLoader,
  type PluginSetup,
  loadPlugin,
  useDispose,
  useEvent,
  useLogger,
} from '@kokkoro/core';

import { createBot, createEvent } from './helpers';

test('插件模块生命周期', async () => {
  const first = createBot();
  const second = createBot();

  const plugin = await loadPlugin(() => import('./fixtures/loader-plugin'));
  const fixture = await import('./fixtures/loader-plugin');

  expect(fixture.calls).toEqual(['import']);

  await first.mount(plugin.setup);
  await second.mount(plugin.setup);
  expect(fixture.calls).toEqual(['import', 'setup', 'mount', 'setup', 'mount']);

  await first.unmount(plugin.setup);
  await second.unmount(plugin.setup);
  await plugin.dispose();
  expect(fixture.calls).toEqual([
    'import',
    'setup',
    'mount',
    'setup',
    'mount',
    'cleanup',
    'cleanup',
    'dispose:second',
    'dispose:first',
  ]);
  fixture.reset();
});

test('插件并发加载', async () => {
  const gate = Promise.withResolvers<void>();
  let loads = 0;
  const loading = loadPlugin(async () => {
    loads++;
    await gate.promise;
    return { default() {} };
  });

  await expect(
    loadPlugin(async () => {
      loads++;
      return { default() {} };
    }),
  ).rejects.toThrow('Plugins cannot be loaded concurrently');
  expect(loads).toBe(1);

  gate.resolve();
  const plugin = await loading;

  await plugin.dispose();
});

test('useDispose 调用时机', async () => {
  expect(() => useDispose(() => {})).toThrow('useDispose() can only be called while loading a plugin');
  await expect(import('./fixtures/unmanaged-plugin')).rejects.toThrow(
    'useDispose() can only be called while loading a plugin',
  );
});

test('插件日志', async () => {
  const calls: unknown[][] = [];
  const logger: Logger = {
    debug: (...args) => calls.push(args),
    info: (...args) => calls.push(args),
    warn: (...args) => calls.push(args),
    error: (...args) => calls.push(args),
  };

  const plugin = await loadPlugin(async () => {
    useLogger().info('loaded');
    return { default() {} };
  }, logger);

  expect(calls).toEqual([['loaded']]);
  expect(() => useLogger()).toThrow('useLogger() can only be called while loading a plugin');
  await plugin.dispose();
});

test('插件加载失败', async () => {
  const calls: string[] = [];

  await expect(
    loadPlugin(async () => {
      useDispose(() => {
        calls.push('dispose');
      });
      throw new Error('load failed');
    }),
  ).rejects.toThrow('load failed');
  expect(calls).toEqual(['dispose']);
});

test('插件加载回滚错误', async () => {
  const loading = loadPlugin(async () => {
    useDispose(() => {
      throw new Error('dispose failed');
    });
    throw new Error('load failed');
  });

  await expect(loading).rejects.toMatchObject({
    error: new Error('dispose failed'),
    name: 'SuppressedError',
    suppressed: new Error('load failed'),
  });
});

test('插件模块格式', async () => {
  const missingDefault = <PluginLoader>(<unknown>(() => Promise.resolve({})));
  const invalidDefault = <PluginLoader>(<unknown>(() => Promise.resolve({ default: 1 })));

  await expect(loadPlugin(missingDefault)).rejects.toThrow(
    'Plugin loader must resolve to a module with a default export',
  );
  await expect(loadPlugin(invalidDefault)).rejects.toThrow('Plugin module default export must be a function');
});

test('插件挂载状态', async () => {
  const bot = createBot();
  const other = createBot();
  const gate = Promise.withResolvers<void>();
  let mounts = 0;

  function setup() {
    useEvent(async () => {
      await gate.promise;
    }, []);
  }

  function wrongSetup() {}

  const mounting = bot.mount(setup);

  await expect(bot.mount(setup)).rejects.toThrow('Plugin setup is already mounted');
  await expect(bot.unmount(setup)).rejects.toThrow('Plugin setup is not mounted');
  await expect(bot.unmount(wrongSetup)).rejects.toThrow('Plugin setup is not mounted');
  expect(() => useEvent(() => {})).toThrow('Hooks can only be called while mounting a plugin');

  function otherSetup() {
    useEvent(() => {
      mounts++;
    }, []);
  }

  await other.mount(otherSetup);
  expect(mounts).toBe(1);

  gate.resolve();
  await mounting;
  await bot.unmount(setup);
  await other.unmount(otherSetup);
});

test('PluginSetup 返回值', async () => {
  const bot = createBot();
  const cause = new Error('async setup failed');
  const invalidSetup = <PluginSetup>(<unknown>(() => 1));
  const asyncSetup = <PluginSetup>(<unknown>(async () => {
    throw cause;
  }));

  await expect(bot.mount(invalidSetup)).rejects.toThrow('Plugin setup must return void or a cleanup function');
  await expect(bot.mount(asyncSetup)).rejects.toMatchObject({
    name: 'TypeError',
    message: 'Plugin setup must be synchronous',
    cause,
  });
});

test('挂载失败回滚', async () => {
  const bot = createBot();
  const calls: string[] = [];
  let fails = true;

  function setup() {
    useEvent(() => {
      calls.push('setup');
    }, []);
    useEvent(() => {
      if (fails) {
        throw new Error('mount failed');
      }
    }, []);

    return () => {
      calls.push('cleanup');
    };
  }

  await expect(bot.mount(setup)).rejects.toThrow('mount failed');
  expect(calls).toEqual(['setup', 'cleanup']);

  fails = false;
  await bot.mount(setup);
  await bot.unmount(setup);
  expect(calls).toEqual(['setup', 'cleanup', 'setup', 'cleanup']);
});

test('挂载回滚错误', async () => {
  const bot = createBot();
  const calls: string[] = [];

  function setup() {
    useEvent(() => {
      calls.push('setup:first');
    }, []);
    useEvent(() => {
      calls.push('setup:second');
      throw new Error('setup failed');
    }, []);

    return () => {
      calls.push('cleanup:first');
      throw new Error('cleanup failed');
    };
  }

  await expect(bot.mount(setup)).rejects.toMatchObject({
    error: new Error('cleanup failed'),
    name: 'SuppressedError',
    suppressed: new Error('setup failed'),
  });
  expect(calls).toEqual(['setup:first', 'setup:second', 'cleanup:first']);
});

test('多 Bot 挂载', async () => {
  const first = createBot();
  const second = createBot();
  const mounted: Bot[] = [];
  const dispatched: Bot[] = [];
  const hasBot: boolean[] = [];

  function setup(bot: Bot) {
    mounted.push(bot);
    useEvent(
      context => {
        dispatched.push(bot);
        hasBot.push(Object.hasOwn(context, 'bot'));
      },
      ['READY'],
    );
  }

  await first.mount(setup);
  await second.mount(setup);
  expect(mounted).toEqual([first, second]);

  await first.emit('READY', createEvent<'READY'>());
  expect(dispatched).toEqual([first]);
  expect(hasBot).toEqual([false]);

  await first.unmount(setup);
  await second.unmount(setup);
});

test('事件依赖', async () => {
  const bot = createBot();
  let every = 0;
  let selected = 0;
  const ready = createEvent<'READY'>();
  const resumed = createEvent<'RESUMED'>();

  function setup() {
    useEvent(() => {
      every++;
    });
    useEvent(() => {
      selected++;
    }, ['RESUMED']);
  }

  await bot.mount(setup);
  await bot.emit('READY', ready);
  await bot.emit('RESUMED', resumed);

  expect(every).toBe(2);
  expect(selected).toBe(1);
});

test('事件回调并发', async () => {
  const bot = createBot();
  const gate = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  const calls: string[] = [];

  function setup() {
    useEvent(async () => {
      calls.push('first:start');
      await gate.promise;
      calls.push('first:end');
      throw new Error('first failed');
    }, ['READY']);
    useEvent(async () => {
      calls.push('second:start');
      started.resolve();
      await gate.promise;
      calls.push('second:end');
      throw new Error('second failed');
    }, ['READY']);
  }

  await bot.mount(setup);
  const dispatch = bot.emit('READY', createEvent<'READY'>());

  await started.promise;
  expect(calls).toEqual(['first:start', 'second:start']);

  gate.resolve();
  await expect(dispatch).rejects.toThrow('first failed');
  expect(calls).toEqual(['first:start', 'second:start', 'first:end', 'second:end']);
});

test('事件并发', async () => {
  const bot = createBot();
  const gate = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  let running = 0;

  function setup() {
    useEvent(async () => {
      running++;

      if (running === 2) {
        started.resolve();
      }
      await gate.promise;
      running--;
    }, ['READY', 'RESUMED']);
  }

  await bot.mount(setup);
  const first = bot.emit('READY', createEvent<'READY'>());
  const second = bot.emit('RESUMED', createEvent<'RESUMED'>());

  await started.promise;
  expect(running).toBe(2);

  gate.resolve();
  await Promise.all([first, second]);
});

test('卸载等待任务', async () => {
  const bot = createBot();
  const gate = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  const calls: string[] = [];

  function setup() {
    useEvent(() => {
      calls.push('mounted');
    }, []);
    useEvent(async () => {
      calls.push('event:start');
      started.resolve();
      await gate.promise;
      calls.push('event:end');
    }, ['READY']);

    return () => {
      calls.push('disposed');
    };
  }

  await bot.mount(setup);
  const dispatch = bot.emit('READY', createEvent<'READY'>());

  await started.promise;
  const unmount = bot.unmount(setup);
  await bot.emit('READY', createEvent<'READY'>());
  expect(calls).toEqual(['mounted', 'event:start']);

  gate.resolve();
  await Promise.all([dispatch, unmount]);
  expect(calls).toEqual(['mounted', 'event:start', 'event:end', 'disposed']);
});

test('事件任务跟踪', async () => {
  const bot = createBot();
  const gate = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  const calls: string[] = [];
  let unmount: Promise<void> | undefined;

  function setup() {
    useEvent(async () => {
      unmount = bot.unmount(setup);
      started.resolve();
      await gate.promise;
      calls.push('event');
    }, ['READY']);

    return () => {
      calls.push('cleanup');
    };
  }

  await bot.mount(setup);
  const dispatch = bot.emit('READY', createEvent<'READY'>());

  await started.promise;
  expect(calls).toEqual([]);

  gate.resolve();

  if (!unmount) {
    throw new Error('未开始取消挂载');
  }
  await Promise.all([dispatch, unmount]);
  expect(calls).toEqual(['event', 'cleanup']);
});

test('卸载清理错误', async () => {
  const bot = createBot();
  const calls: string[] = [];

  function setup() {
    return () => {
      calls.push('cleanup');
      throw new Error('cleanup failed');
    };
  }

  await bot.mount(setup);
  await expect(bot.unmount(setup)).rejects.toThrow('cleanup failed');
  expect(calls).toEqual(['cleanup']);

  calls.length = 0;
  await bot.mount(setup);
  await expect(bot.unmount(setup)).rejects.toThrow('cleanup failed');
  expect(calls).toEqual(['cleanup']);
});
