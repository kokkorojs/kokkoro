# 数据持久化 {#persistence}

::: warning
Kokkoro v3 已基于 Bun 重构，Bun 原生提供 [SQLite](https://bun.com/docs/runtime/sqlite) API。新的数据持久化体系仍在设计和评估。本页保留旧版数据包的 API，示例使用 v3 的插件语法。旧版数据包与 v3 的兼容性尚未验证。
:::

机器人插件经常需要保存群配置、用户数据和运行状态。Kokkoro 以前提供过两种本地数据持久化方案：

- **@kokkoro/jsondb** 将数据写入 JSON 文件，适合数据量较小且需要直接查看或修改的场景。
- **@kokkoro/database** 基于 LevelDB，适合按键读写大量数据的场景。

## Kokkoro v1：JSON 文件 {#v1-json}

Kokkoro v1 提供了 `@kokkoro/jsondb`，可以像操作普通对象一样读写 JSON 文件。

```shell
bun add @kokkoro/jsondb @kokkoro/utils
```

`@kokkoro/jsondb@1.2.3` 在运行时依赖 `@kokkoro/utils`，但其 `package.json` 没有声明该依赖，因此需要同时安装这两个包。

下面的插件会为每位用户保存最近一次签到时间。重新启动 Kokkoro 后，之前的签到记录仍然可以查询。

```typescript
import { useCommand } from '@kokkoro/core';
import { Database } from '@kokkoro/jsondb';

const database = new Database('data/plugins/check-in');

export default () => {
  useCommand('/签到', context => {
    const userId = context.author.union_openid;
    const checkedAt = new Date().toLocaleString('zh-CN');

    database[userId] = checkedAt;

    return `签到成功\n签到时间：${checkedAt}`;
  });

  useCommand('/签到记录', context => {
    const checkedAt = database[context.author.union_openid];

    return checkedAt ? `上次签到时间：${checkedAt}` : '还没有签到记录';
  });
};
```

首次创建 `Database` 时，模块会自动生成 `data/plugins/check-in/index.json`。读取属性会重新载入文件，赋值和删除属性则会立即写回文件。

### API {#json-api}

#### `new Database(path)` {#json-database}

创建一个数据库。`path` 表示保存数据库的目录，可以使用相对路径或绝对路径。目标目录或 `index.json` 不存在时，模块会自动创建。

#### 读取数据 {#json-read}

```javascript
const message = database.message;
```

每次读取属性时，模块都会重新载入 `index.json`。程序运行期间直接修改文件，下一次读取也能得到更新后的数据。

#### 写入数据 {#json-write}

```javascript
database.message = 'hello world';
database.options = { enabled: true };
```

写入的数据必须能够转换为 JSON。赋值完成后，模块会立即更新 `index.json`。

#### 删除数据 {#json-delete}

```javascript
delete database.message;
```

删除属性后，模块也会立即更新 `index.json`。

## Kokkoro v2：LevelDB {#v2-leveldb}

Kokkoro v2 提供了 `@kokkoro/database`。该模块继承 [ClassicLevel](https://www.npmjs.com/package/classic-level)，并新增了 `has()` 方法。

```shell
bun add @kokkoro/database
```

下面的插件使用用户 ID 保存签到时间，并提供查询和删除签到记录的指令。

```typescript
import { useCommand, useDispose } from '@kokkoro/core';
import { Database } from '@kokkoro/database';

const database = new Database<Record<string, string>>('check-in');

useDispose(() => database.close());

export default () => {
  useCommand('/签到', async context => {
    const userId = context.author.union_openid;
    const checkedAt = new Date().toLocaleString('zh-CN');

    await database.put(userId, checkedAt);

    return '签到成功';
  });

  useCommand('/签到记录', async context => {
    const userId = context.author.union_openid;

    if (!(await database.has(userId))) {
      return '还没有签到记录';
    }

    const checkedAt = await database.get(userId);

    return `上次签到时间：${checkedAt}`;
  });

  useCommand('/清除签到', async context => {
    await database.del(context.author.union_openid);

    return '签到记录已清除';
  });
};
```

`new Database('check-in')` 会将数据保存在当前项目的 `data/database/check-in` 目录中。数据库连接属于插件模块共享的资源，因此示例通过 `useDispose()` 在释放插件时关闭连接。

### API {#leveldb-api}

#### `new Database(location, options?)` {#leveldb-database}

创建一个数据库。`location` 表示 `data/database` 下的存储目录，`options` 与 `ClassicLevel` 的构造参数一致。

`Database<T>` 的泛型用于描述每个键对应的值。示例中的 `Record<string, string>` 表示键和值都是字符串。

#### `database.put(key, value)` {#leveldb-put}

写入一个键值对。键已经存在时，新的值会覆盖原值。

```typescript
await database.put('user-id', new Date().toISOString());
```

#### `database.get(key)` {#leveldb-get}

读取指定键的值。键不存在时，Promise 会被拒绝。读取前不确定键是否存在时，可以先调用 `has()`。

```typescript
const checkedAt = await database.get('user-id');
```

#### `database.has(key)` {#leveldb-has}

判断指定键是否存在。

```typescript
const hasCheckedIn = await database.has('user-id');
```

#### `database.del(key)` {#leveldb-del}

删除指定键及其对应的值。

```typescript
await database.del('user-id');
```

#### `database.close()` {#leveldb-close}

关闭数据库连接。插件在模块顶层创建数据库时，可以通过 `useDispose()` 注册清理函数。

```typescript
useDispose(() => database.close());
```

`@kokkoro/database` 也继承了 `ClassicLevel` 的批量操作和迭代器等 API。完整用法见 [ClassicLevel API](https://github.com/Level/classic-level#api)。
