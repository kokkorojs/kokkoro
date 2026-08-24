# @kokkoro/core

[![npm downloads](https://img.shields.io/npm/dm/@kokkoro/core?style=flat-square&labelColor=FAFAFA&color=CB3837&logo=npm&logoColor=CB3837)](https://www.npmjs.com/package/@kokkoro/core)
[![license](https://img.shields.io/github/license/kokkorojs/kokkoro?style=flat-square&labelColor=FAFAFA&color=181717&logo=github&logoColor=181717)](https://github.com/kokkorojs/kokkoro/blob/master/LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-%5E6.0.3-3178c6?style=flat-square&labelColor=FAFAFA&logo=typescript&logoColor=3178c6)](https://www.typescriptlang.org)

如果你想快速开发机器人，建议直接使用 [Kokkoro](https://kokkoro.js.org) 框架，`@kokkoro/core` 不包含 web、database、desktop client 等服务，数据交互逻辑需要手动管理。

Core 基于 [Chobits](https://github.com/xueelf/chobits) 开发，保留 QQ 官方事件与 OpenAPI，并提供 Hook 插件系统和 Command API。

该包直接发布 TypeScript 代码，因为 Kokkoro 官方工具链使用 [Bun](https://bun.com) 进行开发。不过 Core 本身并不调用 Runtime 独有的 API，所以如果你只想在 Node 项目中使用 Core，也可以通过 [tsx](https://github.com/privatenumber/tsx) 来运行。

## 安装

```bash
bun add @kokkoro/core
```

在 Node 项目中使用 Core：

```bash
npm install -D tsx
npm install @kokkoro/core

node --import=tsx main.ts
```

下面的示例按照 Bun 环境编写，在 Node 项目读取环境变量时，请将 `import.meta.env` 换成 `process.env`。

## 使用

```typescript
import { Bot } from '@kokkoro/core';

const { APP_ID: appId, CLIENT_SECRET: clientSecret } = import.meta.env;

if (!appId || !clientSecret) {
  throw new Error('APP_ID and CLIENT_SECRET are required');
}
const bot = new Bot({
  appId,
  clientSecret,
});

await bot.online();
```

`Bot` 直接继承 Chobits 的 `Client` 类，特性与 SDK 保持一致。原生 QQ 事件、`online()`、`offline()`、`callback()` 和所有 OpenAPI 方法都可以直接使用。

## 插件

你可以在项目根目录创建 `plugins` 文件夹，用于存放插件代码。

```text
./
├── plugins/
│   └── example.ts
└── main.ts
```

当然，这并不是强制要求，推荐这么做只是为了方便插件的分类与管理。

插件模块默认导出一个同步函数，这个函数称为 `PluginSetup`。在函数中使用 `useEvent()` 监听 QQ 事件，使用 `useCommand()` 注册消息指令和快捷方式：

```typescript
// plugins/example.ts
import { useCommand, useEvent } from '@kokkoro/core';

export default function Example() {
  // 机器人连接成功后输出用户名
  useEvent(
    context => {
      console.log('机器人“%s”已连接', context.user.username);
    },
    ['READY'],
  );

  // 收到「/ping」指令或「测试」消息时回复 pong
  useCommand('/ping', () => 'pong').shortcut('测试');
  // 收到「/echo」指令后原样回复指令参数
  useCommand('/echo <messages>...', context => context.args.messages.join(' '));
}
```

这就是一个最简单的 Kokkoro 插件。将 `PluginSetup` 通过 `Bot.mount()` 挂载后，插件才会开始处理事件和指令：

```typescript
// main.ts
import { Bot } from '@kokkoro/core';

import Example from './plugins/example';

const { APP_ID: appId, CLIENT_SECRET: clientSecret } = import.meta.env;

if (!appId || !clientSecret) {
  throw new Error('APP_ID and CLIENT_SECRET are required');
}
const bot = new Bot({
  appId,
  clientSecret,
});

await bot.mount(Example);
await bot.online();
```

`PluginSetup` 只在挂载时执行，真正处理事件和指令的是其内部的 Hook 函数。

Core 使用 `PluginSetup` 的函数引用识别挂载，因此 Bot.unmount() 必须接收同一个函数：

```typescript
await bot.unmount(Example);
```

如果插件创建了例如定时器之类的副作用代码，可以从 `PluginSetup` 返回清理函数。在调用 `Bot.unmount()` 时会自动执行它：

```typescript
export default function Example() {
  const timer = setInterval(() => {}, 1000);

  return () => clearInterval(timer);
}
```

### 事件

使用 `useEvent()` 时，第二个参数将会决定回调函数的执行时机：

```typescript
useEvent(context => {
  // 每个 QQ Dispatch 事件都会执行
});

useEvent(context => {
  // 插件挂载时执行一次
}, []);

useEvent(
  context => {
    // 只在收到 READY 或 RESUMED 时执行
  },
  ['READY', 'RESUMED'],
);
```

`Client` 的 `error` 和自定义事件仍通过 `bot.on()` 监听，不会交给 `useEvent()` 处理。

`useEvent()` 回调函数的 `context` 包含对应 QQ 事件的全部 Payload 字段，并额外提供当前的 `context.bot` 属性：

```typescript
useEvent(
  async context => {
    const { username } = await context.bot.getBotInfo();
    console.log('%s已上线', username);
  },
  ['READY'],
);
```

### 指令

机器人指令需要在 [QQ 开放平台](https://q.qq.com) 进行配置，必须以 `/` 开头，这是平台的强制要求。配置好后，在 QQ 聊天框内输入斜杠后会弹出对应的菜单面板。

使用 `useCommand()` 定义指令。指令参数使用 `<name>`、`[name]`、`<name>...` 和 `[name]...` 声明，`context.args` 会根据字符串字面量自动推导类型。

| 声明        | 含义               | 类型                  |
| ----------- | ------------------ | --------------------- |
| `<name>`    | 必填参数           | `string`              |
| `[name]`    | 可选参数           | `string \| undefined` |
| `<name>...` | 一个或多个剩余参数 | `string[]`            |
| `[name]...` | 零个或多个剩余参数 | `string[]`            |

必填参数必须位于可选参数之前，剩余参数必须位于末尾。消息内容按空白分隔参数，不解析 Shell 引号。

Command 的 `context` 会直接展开消息事件，因此可以直接使用 `context.id`、`context.content` 和 `context.reply()`。`context.bot` 是当前 Bot，`context.args` 则是解析后的参数。

处理函数返回 `undefined` 时不会自动回复。返回 QQ 消息对象时会原样交给 `context.reply()`，返回其他对象或数组时使用 `JSON.stringify()` 转为文本，其他返回值使用 `String()` 转为文本。

`shortcut()` 可以使用字符串或正则表达式匹配自然语言。正则表达式中的命名捕获组会写入 `context.args` 的同名字段，例如：

```typescript
import { useCommand } from '@kokkoro/core';

export default function Weather() {
  // 收到「/天气 北京」或「查询北京天气」时回复「北京天气晴」
  useCommand('/天气 <city>', context => `${context.args.city}天气晴`).shortcut(/^查询(?<city>.+)天气$/);
}
```

### 副作用

插件模块的顶层代码只在首次导入时执行一次。在这里建立的数据库连接等资源会由所有 Bot 共享，不属于任何一次 Bot 挂载，因此 `Bot.unmount()` 不会释放它们。

使用 `useDispose()` 可以为这类共享资源登记清理函数。调用 `useDispose()` 的插件必须通过 `loadPlugin()` 动态导入，未使用 `useDispose()` 的插件仍然可以像前文一样静态导入。

例如，下面的签到插件会在模块首次导入时连接 MongoDB，并登记关闭连接的清理函数：

```typescript
// plugins/check-in.ts
import { useCommand, useDispose } from '@kokkoro/core';
import { MongoClient } from 'mongodb';

const client = await MongoClient.connect('mongodb://localhost:27017');
const database = client.db('users');

useDispose(() => client.close());

export default function CheckIn() {
  useCommand('/签到', async context => {
    try {
      await database
        .collection('records')
        .updateOne({ userId: context.author.union_openid }, { $set: { checkedAt: new Date() } }, { upsert: true });
      return '签到成功';
    } catch {
      return '签到失败';
    }
  });
}
```

`loadPlugin()` 会等待模块执行完成，然后返回包含 `setup` 和 `dispose()` 的 `Plugin`：

```typescript
interface Plugin {
  readonly setup: PluginSetup;
  dispose(): Promise<void>;
}
```

通过 `loadPlugin()` 导入签到插件，再将 `plugin.setup` 挂载到 Bot：

```typescript
import { loadPlugin } from '@kokkoro/core';

const plugin = await loadPlugin(() => import('./plugins/check-in'));

await bot.mount(plugin.setup);

await bot.unmount(plugin.setup);
// 关闭数据库连接
await plugin.dispose();
```

`plugin.setup` 是模块默认导出的 `PluginSetup`，同一个函数可以分别挂载到多个 Bot。释放插件前，要先从所有 Bot 取消挂载，再调用 `plugin.dispose()` 执行由 `useDispose()` 登记的清理函数。

`loadPlugin()` 接收 `() => import()`，不直接接收路径字符串。文件路径仍由原生 `import()` 解析，同时保留编辑器补全与 TypeScript 类型检查。

`loadPlugin()` 不能并发执行，加载多个插件时需要逐个 `await`。

### 社区插件

社区插件与项目内插件使用相同的模块结构和 API。将默认导出 `PluginSetup` 的插件模块发布到 npm 即可。社区插件推荐使用 `kokkoro-plugin-` 包名前缀，便于在 [npm](https://www.npmjs.com/search?q=kokkoro-plugin) 中搜索。安装前请确认插件的 `peerDependencies` 支持当前 `@kokkoro/core` 版本。

以下使用 `kokkoro-plugin-example` 代表任意社区插件：

```bash
bun add kokkoro-plugin-example
```

```typescript
import { loadPlugin } from '@kokkoro/core';

const plugin = await loadPlugin(() => import('kokkoro-plugin-example'));

await bot.mount(plugin.setup);
```

调用方无法预先确定社区插件是否包含需要清理的副作用，因此社区插件应始终通过 `loadPlugin()` 导入，不推荐静态导入 `PluginSetup` 函数。

## 配置项

`Bot` 直接使用 Chobits 的 `ClientOptions`，字段完全保持一致。

## 注意事项

每个 Bot 实例都单独管理 `PluginSetup` 的挂载状态：

```typescript
await bot.mount(Example);
await bot.unmount(Example);
```

`PluginSetup` 必须同步执行。`bot.unmount()` 只会执行该次挂载返回的清理函数，`plugin.dispose()` 只会执行通过 `useDispose()` 登记的清理函数。其他副作用由开发者自行管理。

`loadPlugin()`、`bot.mount()`、`bot.unmount()` 和 `plugin.dispose()` 不会静默捕获错误，任何失败都会通过 Promise rejection 交给调用方。错误记录与插件隔离由完整的 Kokkoro 框架处理。

`bot.unmount()` 会等待该次挂载当前的任务全部结束。不要在由同一个 `PluginSetup` 登记的 Event 或 Command 处理函数中执行 `await bot.unmount(Example)`，如果需要卸载当前插件，应交给应用层处理。

## 示例

仓库中的 [examples](./examples) 提供简单的代码示例，包含 Echo 和 Terminal 插件。运行前，请在 `packages/core/.env` 中填写机器人 AppID 与 AppSecret：

```env
APP_ID=机器人 AppID
CLIENT_SECRET=机器人 AppSecret
```

```shell
cd packages/core
bun run examples/main.ts
```

Terminal 用于在聊天中执行 JavaScript 代码，Echo 可用于自定义消息输出，便于开发者调试自己的机器人。
