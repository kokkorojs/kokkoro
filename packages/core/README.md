# @kokkoro/core

[![npm downloads](https://img.shields.io/npm/dm/@kokkoro/core?style=flat-square&labelColor=FAFAFA&color=CB3837&logo=npm&logoColor=CB3837)](https://www.npmjs.com/package/@kokkoro/core)
[![license](https://img.shields.io/github/license/kokkorojs/kokkoro?style=flat-square&labelColor=FAFAFA&color=181717&logo=github&logoColor=181717)](https://github.com/kokkorojs/kokkoro/blob/master/LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-%5E6.0.3-3178c6?style=flat-square&labelColor=FAFAFA&logo=typescript&logoColor=3178c6)](https://www.typescriptlang.org)

如果需要从配置文件启动完整的机器人项目，可以直接使用 [Kokkoro](https://kokkoro.js.org)。`@kokkoro/core` 只提供 `Bot`、Hook 和 Command API，不负责读取 `kokkoro.json`、检索插件或启动 HTTP 服务。

`Bot` 继承 [Chobits](https://github.com/xueelf/chobits) 的 `Client`，可以直接监听 QQ 官方事件并调用 OpenAPI。Core 在此基础上增加了 Hook 插件系统和 Command API。

该包直接发布 TypeScript 源码。Core 不调用 Bun 专属 API，但当前仓库只在 [Bun](https://bun.com) 中测试。在 Node.js 项目中，可以通过 [tsx](https://github.com/privatenumber/tsx) 运行源码，实际兼容性取决于 Node.js 是否支持当前版本使用的 ECMAScript 特性。

## 安装

```bash
bun add @kokkoro/core
```

在使用 ESM 的 Node.js 项目中，可以通过 `tsx` 运行 Core：

```bash
npm install -D tsx
npm install @kokkoro/core

node --import=tsx main.ts
```

下文使用 Bun。项目运行在 Node.js 上时，需要改用 `process.env` 读取环境变量。

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

`Bot` 的构造参数沿用 Chobits 的 `ClientOptions`。

### 发送图片

`sendUserImage()` 向指定用户发送图片，`sendGroupImage()` 向指定群聊发送图片。第一个参数是用户或群聊的 OpenID，第二个参数是图片 URL。可选的第三个参数用于附加 `msg_id` 等消息字段。

```typescript
await bot.sendUserImage('USER_OPENID', 'https://example.com/image.png');

await bot.sendGroupImage('GROUP_OPENID', 'https://example.com/image.png', {
  msg_id: 'MESSAGE_ID',
});
```

Core 会先上传图片，再使用上传结果发送富媒体消息。

## 插件

直接使用 Core 时，插件文件可以放在任意目录。下面的 `plugins` 文件夹只用于分类管理：

```text
./
├── plugins/
│   └── example.ts
└── main.ts
```

插件模块默认导出一个同步函数，这个函数称为 `PluginSetup`。挂载插件时，Core 会将当前 `Bot` 作为参数传入。在函数中使用 `useEvent()` 监听 QQ 事件，使用 `useCommand()` 注册消息指令和快捷方式：

```typescript
// plugins/example.ts
import { useCommand, useEvent } from '@kokkoro/core';

export default () => {
  // 机器人连接成功后输出用户名
  useEvent(
    context => {
      console.log('机器人“%s”已连接', context.user.username);
    },
    ['READY'],
  );

  // 收到「/ping」指令或「在吗」消息时回复 pong
  useCommand('/ping', () => 'pong').shortcut('在吗');
  // 收到「/echo」指令后原样回复指令参数
  useCommand('/echo <parts>...', context => context.args.parts.join(' '));
};
```

插件不需要直接调用 `Bot` 方法时，可以像上例一样省略参数。

这就是一个最简单的 Kokkoro 插件。将 `PluginSetup` 通过 `bot.mount()` 挂载后，插件才会开始处理事件和指令：

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

`PluginSetup` 只在挂载时执行，之后由它注册的事件和指令处理函数响应事件。

Core 使用 `PluginSetup` 的函数引用识别挂载，因此 `bot.unmount()` 必须接收同一个函数：

```typescript
await bot.unmount(Example);
```

如果插件创建了定时器等副作用，可以从 `PluginSetup` 返回清理函数。`bot.unmount()` 会自动执行该函数：

```typescript
export default () => {
  const timer = setInterval(() => {}, 1000);

  return () => clearInterval(timer);
};
```

### 监听事件

`useEvent()` 的第二个参数是事件依赖列表，用于选择处理函数监听的事件：

```typescript
useEvent(context => {
  // 每个 QQ Dispatch 事件都会执行
});

useEvent(() => {
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

`context` 保存当前 QQ 事件的数据。事件支持回复时，它还会提供 `reply()`。需要调用其他 QQ OpenAPI 时，可以使用 `PluginSetup` 接收的 `bot` 参数：

```typescript
import { type Bot, useEvent } from '@kokkoro/core';

export default (bot: Bot) => {
  useEvent(async () => {
    const info = await bot.getBotInfo();

    console.log(info);
  }, ['READY']);
};
```

### 注册指令

`useCommand()` 的指令语法必须以 `/` 开头，并在斜杠后包含指令名称。QQ 开放平台的指令面板只负责在客户端展示指令，并将用户点击的内容填入输入框，不会替 Core 注册指令。

使用 `useCommand()` 定义指令。指令参数使用 `<name>`、`[name]`、`<name>...` 和 `[name]...` 声明，`context.args` 会根据字符串字面量自动推导类型。

| 声明                | 含义               | 类型                |
| ------------------- | ------------------ | ------------------- |
| **&lt;name&gt;**    | 必填参数           | string              |
| **[name]**          | 可选参数           | string \| undefined |
| **&lt;name&gt;...** | 一个或多个剩余参数 | string[]            |
| **[name]...**       | 零个或多个剩余参数 | string[]            |

必填参数必须位于可选参数之前，剩余参数必须位于末尾。消息内容按空白分隔参数，不解析 Shell 引号。指令缺少必填参数时，Core 会回复正确的指令语法。没有对应声明的多余参数会被忽略。

指令上下文包含当前消息的数据，并增加 `args` 和 `trigger`。可以直接读取事件字段或调用 `context.reply()`。其他 `Bot` 方法通过 `PluginSetup` 接收的 `bot` 调用。

处理函数的返回值是文本回复的简写。无返回值时不会自动回复。返回对象或数组时，Core 使用 `JSON.stringify()` 转为文本。返回其他值时，Core 使用 `String()` 转为文本。QQ 消息对象通过 `context.reply()` 发送。

调用 `context.reply()` 后，处理函数应当保持无返回值。直接返回 `context.reply()` 的结果时，Core 会把消息发送结果再次转换为文本回复。

处理函数抛出 `Error` 时，Core 会将 `error.message` 回复给消息来源，错误会继续向上传播。该行为不受 `context.trigger` 影响。某个快捷方式需要静默处理预期失败时，处理函数需要捕获该错误，并在 `context.trigger === 'shortcut'` 时不再抛出。处理函数不得抛出 `Error` 以外的值。

`shortcut()` 可以使用字符串或正则表达式匹配自然语言。正则表达式中的命名捕获组会写入 `context.args` 的同名字段。

指令含有必填参数时，正则快捷方式必须声明同名的命名捕获组，否则插件挂载会失败。该捕获组还要保证每次匹配都能得到非空内容。字符串快捷方式无法提取参数，只能用于没有必填参数的指令。

下面的示例通过 `city` 命名捕获组提供必填参数：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  // 收到「/天气 北京」或「查询北京天气」时回复「北京天气：晴」
  useCommand('/天气 <city>', context => `${context.args.city}天气：晴`).shortcut(/^查询(?<city>.+)天气$/);
};
```

### 记录日志

`useLogger()` 获取 `loadPlugin()` 提供的日志记录器。包含 `useLogger()` 的插件必须通过 `loadPlugin()` 动态导入，Kokkoro 完整框架会自动完成这个过程。直接使用 Core 时，需要先加载插件，再挂载返回的 `plugin.setup`：

```typescript
// plugins/example.ts
import { useLogger } from '@kokkoro/core';

const logger = useLogger();

logger.info('插件模块已加载');

export default () => {};
```

```typescript
import { loadPlugin } from '@kokkoro/core';

const plugin = await loadPlugin(() => import('./plugins/example'));

await bot.mount(plugin.setup);
```

`useLogger()` 只能在插件模块加载期间调用，因此需要写在模块顶层。获取到的日志记录器可以在 `PluginSetup`、事件回调和指令处理函数中使用。

`loadPlugin()` 的第二个参数可以传入自定义 `Logger`。省略该参数时，Core 使用 `console`。

### 清理模块资源

插件模块的顶层代码只在首次导入时执行一次。在这里建立的数据库连接等资源会由所有 `Bot` 共享，不属于任何一次 `Bot` 挂载，因此 `bot.unmount()` 不会释放它们。

`useDispose()` 和 `useLogger()` 都属于模块级 Hook。插件调用其中任意一个时，必须通过 `loadPlugin()` 动态导入。不调用模块级 Hook 时，仍然可以像前文一样静态导入 `PluginSetup` 函数。

例如，下面的签到插件使用 MongoDB 保存记录。安装 `mongodb` 后，插件会在模块首次导入时建立连接，并通过 `useDispose()` 声明关闭连接的清理函数：

```shell
bun add mongodb
```

```typescript
// plugins/check-in.ts
import { useCommand, useDispose } from '@kokkoro/core';
import { MongoClient } from 'mongodb';

const client = await MongoClient.connect('mongodb://localhost:27017');
const database = client.db('users');

useDispose(() => client.close());

export default () => {
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
};
```

`loadPlugin()` 会等待模块执行完成，然后返回包含 `setup` 和 `dispose()` 的 `Plugin`：

```typescript
interface Plugin {
  readonly setup: PluginSetup;
  dispose(): Promise<void>;
}
```

通过 `loadPlugin()` 导入签到插件，再将 `plugin.setup` 挂载到 `Bot`：

```typescript
import { loadPlugin } from '@kokkoro/core';

const plugin = await loadPlugin(() => import('./plugins/check-in'));

await bot.mount(plugin.setup);

await bot.unmount(plugin.setup);
// 关闭数据库连接
await plugin.dispose();
```

`plugin.setup` 是模块默认导出的 `PluginSetup`，同一个函数可以分别挂载到多个 `Bot`。释放插件前，要先从所有 `Bot` 取消挂载，再调用 `plugin.dispose()` 执行由 `useDispose()` 收集的清理函数。

`loadPlugin()` 接收 `() => import()`，不直接接收路径字符串。文件路径仍由原生 `import()` 解析，同时保留编辑器补全与 TypeScript 类型检查。

`loadPlugin()` 不能并发执行，加载多个插件时需要逐个 `await`。

### 发布社区插件

社区插件与项目内插件使用相同的模块结构和 API。将默认导出 `PluginSetup` 的插件模块发布到 npm 即可。社区插件推荐使用 `kokkoro-plugin-` 包名前缀，便于在 [npm](https://www.npmjs.com/search?q=kokkoro-plugin) 中搜索。插件的 `peerDependencies` 应当支持当前使用的 `@kokkoro/core` 版本。

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

## 生命周期约束

每个 `Bot` 实例都单独管理 `PluginSetup` 的挂载状态：

```typescript
await bot.mount(Example);
await bot.unmount(Example);
```

`PluginSetup` 接收当前 `Bot`，并且必须同步执行。`bot.unmount()` 只会执行该次挂载返回的清理函数，`plugin.dispose()` 只会执行通过 `useDispose()` 收集的清理函数。其他副作用由开发者自行管理。

`loadPlugin()`、`bot.mount()`、`bot.unmount()` 和 `plugin.dispose()` 失败时都会抛出错误，调用方可以通过 `await` 捕获。完整的 Kokkoro 框架会记录插件加载和挂载错误，并继续处理其他插件或机器人。启动回滚期间的取消挂载或资源释放失败时，错误仍会导致启动失败。

`bot.unmount()` 会等待该插件正在执行的事件和指令。不要在同一插件的处理函数中 `await bot.unmount(Example)`，否则取消挂载会一直等待当前处理函数结束。需要卸载当前插件时，先结束处理函数，再由应用层调用 `bot.unmount()`。

## 示例

仓库中的 [examples](./examples) 提供简单的代码示例，包含 Echo 和 Eval 插件。运行这些示例前，需要在 `packages/core/.env` 中填写机器人 AppID 与 ClientSecret：

```env
APP_ID=机器人 AppID
CLIENT_SECRET=机器人 ClientSecret
```

```shell
cd packages/core
bun run examples/main.ts
```

Eval 用于在聊天中执行 JavaScript 代码，Echo 可用于自定义消息输出，便于开发者调试自己的机器人。
