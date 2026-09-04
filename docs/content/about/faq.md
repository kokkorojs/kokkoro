# 常见问题 {#faq}

## 为什么 Kokkoro 只支持 Bun？ {#why-bun}

Kokkoro 只支持 [Bun](https://bun.com/docs) 运行时，也不打算为 Node.js 维护另一套运行方案。

早期版本的 Kokkoro 运行在 Node.js 上。开发和维护项目时，我还要从 npm、Yarn 和 pnpm 中选择包管理器，并另外配置 TypeScript 执行、测试和构建工具。以 monorepo 为例，npm 和 Yarn 从 `package.json` 的 `workspaces` 读取工作区，pnpm 则使用独立的 `pnpm-workspace.yaml`。更换包管理器时，工作区配置也要随之调整。

Kokkoro 早期还要兼容 Node.js 14、16 和 18。Node.js 各版本支持的 API 不同，ESM 的行为也存在差异，我需要通过 nvm 或 fnm 反复切换环境，逐一验证兼容性。

在 Bun 1.0 发布后，我将所有自己维护的项目都迁移到了 Bun 生态体系。Bun 同时提供运行时、包管理器、测试工具和构建工具，并支持在 `package.json` 中声明 `workspaces`，将运行、依赖管理、测试和构建统一在同一套工具链中。

Kokkoro 使用了 `decorators` 与 `using` 等现代语法。Bun 可以直接运行 TypeScript 源码并支持这些语法，无需再配置 Babel 或额外的 TypeScript 执行工具。

使用 Bun 的内置 API 还能减少第三方依赖。例如，Kokkoro 使用 `Bun.serve()` 启动 HTTP 服务，插件可以直接使用 `bun:sqlite` 访问 SQLite。选择单一运行时是为了把更多精力放在 Kokkoro 本身，而不是持续维护多套运行环境和工具链。

## WebSocket 和 WebHook 应该怎么选？ {#websocket-or-webhook}

**WebSocket** 会主动连接 QQ 服务，适合本地开发和能够持续运行的服务器。

**WebHook** 通过 HTTP 路由接收 QQ 推送，需要一个可以从公网访问的 HTTPS 回调地址。部署 WebHook 时，还要在 QQ 机器人管理后台填写该地址。

首次使用 Kokkoro 时，建议选择 WebSocket，因为它不需要公网地址。

同一个项目可以同时使用两种接入方式，详情参阅 [配置文件](/guide/config#protocols)。

## 为什么不兼容 QQ 频道？ {#qq-channel-support}

~~因为 QQ 频道是史！~~

QQ 频道使用独立的接口和事件结构，与 QQ 群聊及私聊不是同一套协议。如果同时支持两者，插件 API 中就会出现大量仅适用于频道的类型、事件和接口。Kokkoro 只面向 QQ 私聊和群聊场景，让插件不必兼容两套差异明显的协议。

## 旧版插件可以继续使用吗？ {#legacy-plugin-support}

Kokkoro v3 保留了主要的 Hook 写法，但调整了插件结构和部分 API，旧版插件需要适配后才能使用。安装社区插件前，请查看版本说明，确认它是否已适配 Kokkoro v3。

## 为什么插件没有自动加载？ {#plugin-not-loaded}

Kokkoro 只会检索 `plugins` 目录下的一级子目录。Kokkoro CLI 创建的本地插件采用以下目录结构：

```text
.
├── plugins/
│   └── example/
│       ├── src/
│       │   └── index.ts
│       └── package.json
└── package.json
```

通过 `kokkoro plugin` 创建本地插件后，还需要在项目根目录运行一次 `bun install`，Bun 才会将新插件链接到工作区。

通过 npm 安装的插件必须在项目根目录 `package.json` 的 `dependencies` 中声明，且包名必须以 `kokkoro-plugin-` 开头：

```json
{
  "dependencies": {
    "kokkoro-plugin-hitokoto": "^3.0.1"
  }
}
```

启动日志会区分插件加载失败与挂载失败，并显示具体原因。Kokkoro 当前不支持插件热更新，添加或更新插件后需要重新启动项目。完整规则见 [插件概述](/develop/overview#plugin-loading)。

## 为什么指令参数都是字符串？ {#command-arguments-as-strings}

QQ 消息本身是文本。Kokkoro 会按照 `useCommand()` 中声明的参数拆分消息内容，不会猜测每段文本表示数字、布尔值还是其他类型，因此单个参数的值保持为 `string`，接收多个值的参数则是 `string[]`。

框架本可以引入 `<count:number>` 这样的专用语法，自动转换参数类型。但这种写法不符合常见的指令参数习惯，还会增加 Kokkoro 独有的学习成本。即使框架完成了类型转换，插件仍然需要根据业务要求检查数字范围。

Kokkoro 负责解析指令参数，类型转换和业务校验则由插件完成：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/抽卡 <count>', context => {
    const count = Number(context.args.count);

    if (!Number.isInteger(count) || count < 1) {
      throw new Error('抽卡次数必须是正整数');
    }
    return `抽取 ${count} 次`;
  });
};
```

详细语法参阅 [转换参数类型](/develop/command-arguments#convert-types)。
