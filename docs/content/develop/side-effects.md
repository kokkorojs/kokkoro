# 副作用清理 {#side-effects}

定时器、数据库连接和手动注册的事件监听器都会持续占用资源或执行任务。这些操作属于插件的副作用，必须在所属的生命周期结束时清理。

资源的创建位置决定了它的作用范围。在模块顶层创建的资源由所有机器人共享，在插件入口中创建的资源只属于当前机器人。

## 模块共享资源 {#module-resources}

模块顶层代码在插件加载时执行一次。这里创建的资源由所有 `Bot` 共享，可以通过 `useDispose()` 注册清理函数。

下面的插件使用 Bun 内置的 SQLite 数据库保存签到时间。数据库在模块顶层打开，由所有机器人共享：

```typescript {7}
import { Database } from 'bun:sqlite';

import { useCommand, useDispose } from '@kokkoro/core';

const database = new Database('check-in.sqlite', { create: true });

useDispose(() => database.close());

database.run(`
  CREATE TABLE IF NOT EXISTS check_ins (
    user_id TEXT PRIMARY KEY,
    checked_at TEXT NOT NULL
  )
`);

const checkIn = database.query(`
  INSERT INTO check_ins (user_id, checked_at)
  VALUES (?, ?)
  ON CONFLICT (user_id) DO UPDATE SET checked_at = excluded.checked_at
`);

export default () => {
  useCommand('/签到', context => {
    checkIn.run(context.author.union_openid, new Date().toISOString());

    return '签到成功';
  });
};
```

`useDispose()` 注册了关闭数据库的清理函数。释放插件模块时，该函数会执行并关闭数据库。如果不执行这一步，数据库连接仍会占用文件和内存资源。

`useDispose()` 只能在模块顶层调用，清理函数可以同步执行，也可以返回 `Promise`。注册多个清理函数时，后注册的函数会先执行。

Kokkoro v3 的数据持久化方案仍在评估，旧版方案和当前状态见 [数据持久化](/develop/persistence)。

通过 Kokkoro CLI 启动项目时，清理函数目前只会在启动失败回滚时执行。按 **Ctrl+C** 会直接结束进程，不会等待异步清理。直接使用 Core 时，可以调用 `plugin.dispose()` 主动释放模块资源。完整顺序见 [插件生命周期](/develop/lifecycle#lifecycle-order)。

## 单个机器人的资源 {#bot-resources}

Kokkoro 会为每个机器人分别执行一次插件入口。入口中创建的资源只属于当前机器人，可以返回一个函数完成清理：

```typescript
export default () => {
  const timer = setInterval(() => {
    console.log('执行当前机器人的定时任务');
  }, 60000);

  return () => {
    clearInterval(timer);
  };
};
```

调用 `bot.unmount()` 取消挂载时，Core 会执行插件返回的清理函数。如果 `PluginSetup` 已经返回清理函数，但后续挂载步骤失败，Core 也会执行该函数。清理函数可以同步执行，也可以返回 `Promise`。

通过 `useEvent()` 和 `useCommand()` 注册的 Hook 会在取消挂载后自动停止，不需要手动清理。直接调用 `bot.on()` 注册的自定义事件监听器不属于 Hook，需要在清理函数中调用 `bot.off()`。完整示例见 [自定义事件](/develop/custom-events)。
