# 副作用清理 {#side-effects}

插件创建的定时器、数据库连接和事件监听不会随着函数执行结束自动释放。这些副作用需要在所属的 [生命周期](/develop/lifecycle) 结束时清理。

## 模块顶层的副作用 {#module-side-effects}

插件模块的顶层代码只会在首次导入时执行一次，很适合用来创建由所有机器人共享的资源。

Bun 原生提供了 [SQLite](https://bun.com/docs/runtime/sqlite) 数据库支持，不需要安装第三方依赖。下面的插件会在首次导入时打开数据库，并通过 `useDispose()` 登记关闭数据库的函数：

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
    checkIn.run(context.author.id, new Date().toISOString());

    return '签到成功';
  });
};
```

释放插件时，Kokkoro 会执行通过 `useDispose()` 登记的清理函数。

## `PluginSetup` 中的副作用 {#plugin-setup}

`PluginSetup` 中产生的副作用只属于当前挂载。你可以从 `PluginSetup` 返回一个清理函数，Kokkoro 会在插件从当前 Bot 取消挂载时执行它。

在 [自定义事件](/develop/event#custom-events) 的示例中，`PluginSetup` 通过 `bot.on()` 注册监听器，再通过返回函数调用 `bot.off()`。定时器、网络连接等副作用也可以使用相同的方式清理。清理函数可以同步执行，也可以返回 `Promise`。

`useEvent()` 注册的 Hook 会在取消挂载时自动移除，因此它的回调函数不能返回清理函数。
