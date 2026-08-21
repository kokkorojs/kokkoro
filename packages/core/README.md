# @kokkoro/core

[![npm downloads](https://img.shields.io/npm/dm/@kokkoro/core?style=flat-square&labelColor=FAFAFA&color=CB3837&logo=npm&logoColor=CB3837)](https://www.npmjs.com/package/@kokkoro/core)
[![license](https://img.shields.io/github/license/kokkorojs/kokkoro?style=flat-square&labelColor=FAFAFA&color=181717&logo=github&logoColor=181717)](https://github.com/kokkorojs/kokkoro/blob/master/LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-%5E6.0.3-3178c6?style=flat-square&labelColor=FAFAFA&logo=typescript&logoColor=3178c6)](https://www.typescriptlang.org)

如果你想快速开发机器人，建议直接使用 [Kokkoro](https://kokkoro.js.org) 框架，`@kokkoro/core` 不包含 web、database、desktop client 等服务。

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

你可以在项目根目录创建 `plugins` 文件夹来存放你编写的插件。

```text
./
├── plugins/
│   └── example.ts
└── main.ts
```

当然，这并不是强制要求，推荐这么做只是为了方便插件的分类与管理。

Kokkoro 插件就是一个同步函数，在函数中调用 Hook 即可：

```typescript
// plugins/example.ts
import { useCommand, useEvent } from '@kokkoro/core';

export default function Example() {
  // 监听 bot 上线事件并输出日志
  useEvent(
    context => {
      console.log('bot "%s" is ready', context.user.username);
    },
    ['READY'],
  );

  // bot 收到「/ping」的指令或「测试」的消息时，会回复 pong
  useCommand('/ping', () => 'pong').shortcut('测试');
  // bot 收到「/echo」的指令后，会复读回复指令携带的参数
  useCommand('/echo <messages>...', context => context.args.messages.join(' '));
}
```

导入插件并将它挂载到 Bot 后，插件才会开始处理事件：

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

如果希望延迟加载模块，可以使用 `import()` 函数传入 Loader：

```typescript
const Example = () => import('./plugins/example');

await bot.mount(Example);
await bot.unmount(Example);
```

Core 通过传给 `mount()` 的函数引用识别插件，因此**卸载插件**时，必须复用同一个 `Plugin` 或 `PluginLoader` 引用。`unmount()` 不会执行 Loader，也不会重新导入模块来判断插件。

### 社区插件

社区插件与本地插件使用相同的 API，只需将默认导出的 `Plugin` 发布到 npm。社区插件推荐使用 `kokkoro-plugin-` 包名前缀，便于在 [npm](https://www.npmjs.com/search?q=kokkoro-plugin) 中搜索。安装前请确认插件的 `peerDependencies` 支持当前 `@kokkoro/core` 版本。

以下使用 `kokkoro-plugin-example` 代表任意社区插件：

```bash
bun add kokkoro-plugin-example
```

```typescript
const Example = () => import('kokkoro-plugin-example');

await bot.mount(Example);
await bot.unmount(Example);
```

### 事件

使用 `useEvent` 时，可以通过第二个参数管理事件依赖。不传时会监听所有 QQ Dispatch 事件。传入空数组时，setup 只在插件挂载时执行一次。传入事件数组时只监听指定事件。

Client 的 `error` 和自定义事件仍通过 `bot.on()` 监听，不会交给 `useEvent`。

`useEvent` 的 `context` 始终提供 `context.bot`。监听事件时还会保留 Chobits `Client.on()` 提供的事件字段，例如监听 `READY` 时可以直接读取 `context.session_id`。传入空数组时没有事件字段。

setup 返回的函数会在下一次 setup 之前或插件卸载时执行，可以用来清理插件副作用：

```typescript
import { cron } from 'bun';

import { useEvent } from '@kokkoro/core';

export default function Example() {
  useEvent(context => {
    // 每天中午在群内发送消息
    const job = cron('0 12 * * *', async () => {
      await context.bot.sendGroupMessage('<group_id>', {
        msg_type: 0,
        content: '午时已到',
      });
    });

    // 插件被卸载后停止 cron 任务
    return () => {
      job.stop();
    };
  }, []);
}
```

### 指令

机器人指令需要在 [QQ 开放平台](https://q.qq.com) 进行配置，必须以 `/` 开头，这是平台的强制要求。配置好后，在 QQ 聊天框内输入斜杠后会弹出对应的菜单面板。

使用 `useCommand` 可以用来定义指令，如果想携带指令参数，使用 `<name>`、`[name]`、`<name>...` 和 `[name]...` 声明，`context.args` 会根据字符串字面量自动推导类型。

Command 的 `context` 会直接展开消息事件，因此可以直接使用 `context.id`、`context.content` 和 `context.reply()`。`context.bot` 是当前 Bot，`context.args` 则是解析后的参数。

处理函数返回 `undefined` 时不会自动回复。返回 QQ 消息对象时会原样交给 `context.reply()`，返回其他对象或数组时使用 `JSON.stringify()` 转为文本，其他返回值使用 `String()` 转为文本。

Shortcut 可以使用字符串或正则表达式匹配自然语言。正则表达式中的命名捕获组会写入 `context.args` 的同名字段，例如：

```typescript
import { useCommand } from '@kokkoro/core';

export default function Weather() {
  // bot 收到「/天气 北京」或者「查询北京天气」时，都会回复「北京天气晴」
  useCommand('/天气 <city>', context => `${context.args.city}天气晴`).shortcut(/^查询(?<city>.+)天气$/);
}
```

## 配置项

`Bot` 直接使用 Chobits 的 `ClientOptions`，字段完全保持一致。

## 注意事项

每个 Bot 实例都单独管理自己的插件：

```typescript
await bot.mount(Example);
await bot.unmount(Example);
```

插件函数必须同步执行。Core 只会清理通过 Hook 登记的资源，在模块顶层或 Hook 外创建的副作用由插件开发者自行管理。

`mount()` 和 `unmount()` 不会静默捕获错误，任何失败都会通过 Promise rejection 交给调用方。错误记录与插件隔离由完整的 Kokkoro 框架处理。

`unmount()` 会等待插件当前的任务全部结束后执行。不要在该插件自己的 Event 或 Command 处理函数中执行 `await bot.unmount(source)`，如果需要卸载当前插件，应交给应用层处理。

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
