# 插件概述 {#plugin-overview}

插件用于将机器人的功能拆成独立模块。一个插件可以注册指令、监听 QQ 事件，也可以调用 QQ API。

Kokkoro 支持本地插件和 npm 插件。两类插件使用相同的 API，区别在于存放位置和安装方式。

## 本地插件 {#local-plugins}

Kokkoro 将项目根目录 `plugins` 下的每个一级子文件夹识别为一个本地插件。使用 CLI 创建的本地插件采用以下结构：

```text
plugins/
└── example/
    ├── src/
    │   └── index.ts
    └── package.json
```

## npm 插件 {#npm-plugins}

发布到 [npm](https://www.npmjs.com/) 的插件可以通过 Bun 安装。在项目根目录中运行：

```shell
bun add kokkoro-plugin-hitokoto
```

Bun 会将插件记录在 `package.json` 的 `dependencies` 中。Kokkoro 会在下一次启动时自动加载该插件。

## 插件标识 {#plugin-identifiers}

每个插件都有一个唯一标识。插件包含 `package.json` 时，Kokkoro 使用其中的 `name` 字段作为插件标识。

本地插件没有 `package.json`，或该文件没有 `name` 字段时，Kokkoro 使用插件的文件夹名称作为标识。

使用 CLI 创建 `example` 插件时，生成的包名是 `kokkoro-plugin-example`。

两个插件的标识相同时，Kokkoro 会停止启动并报告重复的插件名称。

## 插件入口 {#plugin-entry}

每个插件都需要默认导出一个同步函数。这个函数是插件入口，类型为 `PluginSetup`：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', () => 'pong');
};
```

Kokkoro 将 `useCommand()` 和 `useEvent()` 这类注册插件功能的函数称为 Hook。示例中的 `useCommand()` 注册了 `/ping` 指令，用户发送该指令后，Kokkoro 会把处理函数返回的「pong」回复到当前会话。

`useCommand()` 和 `useEvent()` 只能在 `PluginSetup` 执行期间调用。调用语句可以直接写在函数体中，也可以写在它同步调用的其他函数中。`PluginSetup` 不能是异步函数。

`useLogger()` 用于获取插件日志记录器，`useDispose()` 用于注册模块资源的清理函数。它们属于模块加载阶段的 Hook，只能写在模块顶层。不同阶段的执行顺序参阅 [插件生命周期](/develop/lifecycle)。

`PluginSetup` 的参数是当前挂载插件的 `Bot`。插件需要调用 QQ API 时，可以使用这个参数：

```typescript
import { type Bot, useCommand } from '@kokkoro/core';

export default (bot: Bot) => {
  useCommand('/机器人', async () => {
    const info = await bot.getBotInfo();

    return `我是 ${info.username}`;
  });
};
```

`type Bot` 只导入 TypeScript 类型，不会产生运行时代码。

同一个插件可以挂载到多个 `Bot`。Kokkoro 会为每个 `Bot` 分别执行一次 `PluginSetup`，每次执行时注册的 Hook 只属于对应的 `Bot`。共享资源和清理副作用的规则参阅 [插件生命周期](/develop/lifecycle)。

## 插件加载规则 {#plugin-loading}

Kokkoro 只检索 `plugins` 下的一级子文件夹。本地插件的 `package.json` 声明了 `name` 时，Kokkoro 会按照其中的 `exports` 等模块配置解析程序入口。没有 `package.json`，或该文件没有 `name` 字段时，Kokkoro 会按照 [Bun 的模块解析规则](https://bun.com/docs/runtime/module-resolution) 解析插件目录，并查找 `index.ts` 等入口文件。

npm 插件来自项目 `package.json` 的 `dependencies`，包名需要以 `kokkoro-plugin-` 开头。Kokkoro 不会遍历 `node_modules`，也不会加载 `devDependencies` 中的插件。

本地插件先于 npm 插件加载。本地插件按照文件夹路径排序，npm 插件按照包名排序。

每个插件模块只会加载一次，模块导出的 `PluginSetup` 会分别挂载到配置中的每个 `Bot`。如果模块加载失败，或者没有有效的默认导出，Kokkoro 会记录该插件的错误并继续加载其他插件。插件挂载到某个 `Bot` 失败时，也不会影响其他 `Bot`。

Kokkoro 会在加载插件前读取本地插件和项目根目录的 `package.json`。其中任何一个文件不是有效的 JSON 时，插件检索会失败，Kokkoro 也会停止启动。

接下来可以继续扩展快速上手中创建的 `example` 插件，具体步骤见 [编写第一个插件](/develop/first-plugin)。
