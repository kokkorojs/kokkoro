import { expect, test } from 'bun:test';

import { type Plugin, type PluginLoader, useEvent } from '@kokkoro/core';

import { createBot, createEvent, tick } from './helpers';

test('动态加载插件', async () => {
  const bot = createBot();
  let loads = 0;
  const loader = () => {
    loads += 1;
    return import('./fixtures/loader-plugin');
  };

  await bot.mount(loader);
  const fixture = await import('./fixtures/loader-plugin');

  expect(loads).toBe(1);
  expect(fixture.calls).toEqual(['render', 'setup']);

  await bot.unmount(loader);
  expect(loads).toBe(1);
  expect(fixture.calls).toEqual(['render', 'setup', 'cleanup']);
  fixture.reset();
});

test('插件挂载状态', async () => {
  const bot = createBot();
  const other = createBot();
  const gate = Promise.withResolvers<void>();

  let loads = 0;
  let wrongLoads = 0;
  let otherSetups = 0;

  function plugin() {}

  const loader: PluginLoader = async () => {
    loads += 1;
    await gate.promise;
    return { default: plugin };
  };
  const wrongLoader: PluginLoader = async () => {
    wrongLoads += 1;
    return { default: plugin };
  };
  const mounting = bot.mount(loader);

  await tick();
  await expect(bot.mount(loader)).rejects.toThrow('Plugin is already mounted');
  await expect(bot.unmount(loader)).rejects.toThrow('Plugin is not mounted');
  await expect(bot.unmount(wrongLoader)).rejects.toThrow('Plugin is not mounted');

  expect(loads).toBe(1);
  expect(wrongLoads).toBe(0);
  expect(() => useEvent(() => {})).toThrow('Hooks can only be called while mounting a plugin');

  function otherPlugin() {
    useEvent(() => {
      otherSetups += 1;
    }, []);
  }

  await other.mount(otherPlugin);
  expect(otherSetups).toBe(1);

  gate.resolve();
  await mounting;
  await bot.unmount(loader);
  await other.unmount(otherPlugin);
});

test('Loader 重试', async () => {
  const bot = createBot();
  let fails = true;

  function plugin() {}

  const loader: PluginLoader = async () => {
    if (fails) {
      throw new Error('load failed');
    }

    return { default: plugin };
  };

  await expect(bot.mount(loader)).rejects.toThrow('load failed');

  fails = false;
  await bot.mount(loader);
  await bot.unmount(loader);
});

test('插件返回值', async () => {
  const bot = createBot();
  const cause = new Error('async plugin failed');
  const returningPlugin = <Plugin>(<unknown>(() => 1));
  const missingDefault = <PluginLoader>(<unknown>(() => Promise.resolve({})));
  const invalidDefault = <PluginLoader>(<unknown>(() => Promise.resolve({ default: 1 })));
  const asynchronousPlugin = <PluginLoader>(<unknown>(() =>
    Promise.resolve({
      default: async () => {
        throw cause;
      },
    })));

  await expect(bot.mount(returningPlugin)).rejects.toThrow('Plugin must return void');
  await expect(bot.mount(missingDefault)).rejects.toThrow(
    'Plugin loader must resolve to a module with a default export',
  );
  await expect(bot.mount(invalidDefault)).rejects.toThrow('Plugin module default export must be a function');
  await expect(bot.mount(asynchronousPlugin)).rejects.toMatchObject({
    name: 'TypeError',
    message: 'Plugin must be synchronous',
    cause,
  });
});

test('Loader Hook 限制', async () => {
  const bot = createBot();

  function plugin() {}

  const loader: PluginLoader = async () => {
    useEvent(() => {}, []);
    return { default: plugin };
  };

  await expect(bot.mount(loader)).rejects.toThrow('Plugin loader cannot register hooks');
});

test('挂载失败回滚', async () => {
  const bot = createBot();
  const calls: string[] = [];
  let fails = true;

  function plugin() {
    useEvent(() => {
      calls.push('setup');
      return () => {
        calls.push('cleanup');
      };
    }, []);
    useEvent(() => {
      if (fails) {
        throw new Error('mount failed');
      }
    }, []);
  }

  await expect(bot.mount(plugin)).rejects.toThrow('mount failed');
  expect(calls).toEqual(['setup', 'cleanup']);

  fails = false;
  await bot.mount(plugin);
  await bot.unmount(plugin);
  expect(calls).toEqual(['setup', 'cleanup', 'setup', 'cleanup']);
});

test('回滚错误', async () => {
  const bot = createBot();
  const calls: string[] = [];

  function plugin() {
    useEvent(() => {
      calls.push('setup:first');
      return () => {
        calls.push('cleanup:first');
        throw new Error('cleanup failed');
      };
    }, []);
    useEvent(() => {
      calls.push('setup:second');
      throw new Error('setup failed');
    }, []);
  }

  await expect(bot.mount(plugin)).rejects.toBeInstanceOf(SuppressedError);
  expect(calls).toEqual(['setup:first', 'setup:second', 'cleanup:first']);
});

test('多 Bot 挂载', async () => {
  const first = createBot();
  const second = createBot();
  const mounted: unknown[] = [];
  const bots: unknown[] = [];

  function plugin() {
    useEvent(context => {
      mounted.push(context.bot);
    }, []);
    useEvent(
      context => {
        bots.push(context.bot);
      },
      ['READY'],
    );
  }

  await first.mount(plugin);
  await second.mount(plugin);
  expect(mounted).toEqual([first, second]);

  await first.emit('READY', createEvent<'READY'>());
  expect(bots).toEqual([first]);

  await first.unmount(plugin);
  await second.unmount(plugin);
});

test('事件依赖', async () => {
  const bot = createBot();
  let every = 0;
  let selected = 0;
  const ready = createEvent<'READY'>();
  const resumed = createEvent<'RESUMED'>();

  function plugin() {
    useEvent(() => {
      every += 1;
    });
    useEvent(() => {
      selected += 1;
    }, ['RESUMED']);
  }

  await bot.mount(plugin);
  await bot.emit('READY', ready);
  await bot.emit('RESUMED', resumed);

  expect(every).toBe(2);
  expect(selected).toBe(1);
});

test('Effect 并发', async () => {
  const bot = createBot();
  const gate = Promise.withResolvers<void>();
  const calls: string[] = [];

  function plugin() {
    useEvent(async () => {
      calls.push('first:start');
      await gate.promise;
      calls.push('first:end');
      throw new Error('first failed');
    }, ['READY']);
    useEvent(async () => {
      calls.push('second:start');
      await gate.promise;
      calls.push('second:end');
      throw new Error('second failed');
    }, ['READY']);
  }

  await bot.mount(plugin);
  const dispatch = bot.emit('READY', createEvent<'READY'>());

  await tick();
  expect(calls).toEqual(['first:start', 'second:start']);

  gate.resolve();
  await expect(dispatch).rejects.toThrow('first failed');
  expect(calls).toEqual(['first:start', 'second:start', 'first:end', 'second:end']);
});

test('事件并发', async () => {
  const bot = createBot();
  const gate = Promise.withResolvers<void>();
  let running = 0;
  let peak = 0;

  function plugin() {
    useEvent(async () => {
      running += 1;
      peak = Math.max(peak, running);
      await gate.promise;
      running -= 1;
    }, ['READY', 'RESUMED']);
  }

  await bot.mount(plugin);
  const first = bot.emit('READY', createEvent<'READY'>());
  const second = bot.emit('RESUMED', createEvent<'RESUMED'>());

  await tick();
  expect(peak).toBe(2);

  gate.resolve();
  await Promise.all([first, second]);
});

test('Effect 清理时机', async () => {
  const bot = createBot();
  const calls: string[] = [];
  let setup = 0;

  function plugin() {
    useEvent(() => {
      setup += 1;
      const current = setup;

      calls.push(`setup:${current}`);
      return async () => {
        calls.push(`cleanup:${current}:start`);
        await Promise.resolve();
        calls.push(`cleanup:${current}:end`);
      };
    }, ['READY']);
  }

  await bot.mount(plugin);
  await bot.emit('READY', createEvent<'READY'>());
  await bot.emit('READY', createEvent<'READY'>());

  expect(calls).toEqual(['setup:1', 'cleanup:1:start', 'cleanup:1:end', 'setup:2']);

  await bot.unmount(plugin);
  expect(calls.at(-2)).toBe('cleanup:2:start');
  expect(calls.at(-1)).toBe('cleanup:2:end');
});

test('卸载等待任务', async () => {
  const bot = createBot();
  const gate = Promise.withResolvers<void>();
  const calls: string[] = [];

  function plugin() {
    useEvent(() => {
      calls.push('mounted');
      return () => {
        calls.push('disposed');
      };
    }, []);
    useEvent(async () => {
      calls.push('event:start');
      await gate.promise;
      calls.push('event:end');
    }, ['READY']);
  }

  await bot.mount(plugin);
  const dispatch = bot.emit('READY', createEvent<'READY'>());

  await tick();
  const unmount = bot.unmount(plugin);
  await bot.emit('READY', createEvent<'READY'>());
  expect(calls).toEqual(['mounted', 'event:start']);

  gate.resolve();
  await Promise.all([dispatch, unmount]);
  expect(calls).toEqual(['mounted', 'event:start', 'event:end', 'disposed']);
});

test('卸载清理错误', async () => {
  const bot = createBot();
  const calls: string[] = [];

  function plugin() {
    useEvent(() => {
      return () => {
        calls.push('first');
        throw new Error('first cleanup failed');
      };
    }, []);
    useEvent(() => {
      return () => {
        calls.push('second');
        throw new Error('second cleanup failed');
      };
    }, []);
  }

  await bot.mount(plugin);
  await expect(bot.unmount(plugin)).rejects.toBeInstanceOf(SuppressedError);
  expect(calls).toEqual(['second', 'first']);

  calls.length = 0;
  await bot.mount(plugin);
  await expect(bot.unmount(plugin)).rejects.toBeInstanceOf(SuppressedError);
  expect(calls).toEqual(['second', 'first']);
});
