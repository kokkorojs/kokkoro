# 常见问题 {#faq}

这里整理了 Kokkoro 的运行环境、接入方式和插件使用等常见问题。

## Kokkoro 可以在 Node.js 中运行吗？ {#node-js-support}

Kokkoro **只支持 Bun**。框架会直接运行 TypeScript 源码，并使用 Bun 管理插件、配置文件和 HTTP 服务。

不过 `@kokkoro/core` 本身不依赖 Bun API。如果只需要使用 Core，可以在 Node.js 中安装 [tsx](https://github.com/privatenumber/tsx) 运行 TypeScript 源码。

## WebSocket 和 WebHook 应该怎么选？ {#websocket-or-webhook}

**WebSocket** 会主动连接 QQ 服务，适合本地开发和能够持续运行的服务器。首次使用 Kokkoro 时，建议选择 WebSocket。

**WebHook** 通过 HTTP 路由接收 QQ 推送，需要一个可以从公网访问的 HTTPS 回调地址。部署 WebHook 时，还要在 QQ 机器人管理后台填写该地址。

同一个项目可以同时使用两种接入方式，详情参阅 [配置文件](/guide/config#protocols)。

## 为什么不兼容 QQ 频道？ {#qq-channel-support}

~~因为 QQ 频道是史！~~

QQ 频道使用独立的接口和事件结构，与 QQ 群聊及私聊并不是同一套体系。Kokkoro 只处理群聊与私聊，可以避免在插件 API 中混合两套差异明显的协议。如果同时兼容 QQ 频道，框架需要维护大量仅适用于频道的类型、事件和接口，不仅会增加代码体积，也会提高插件开发和维护成本。

## 旧版插件可以继续使用吗？ {#legacy-plugin-support}

Kokkoro v3 保留了主要的 Hook 写法，但调整了插件结构和部分 API。旧版插件需要完成适配后再使用。安装社区插件前，请确认它是否已适配 Kokkoro v3。

## 为什么插件没有自动加载？ {#plugin-not-loaded}

Kokkoro 只会检索 `plugins` 的一级子目录。本地插件的目录结构如下：

```text
.
├── plugins/
│   └── example/
│       ├── src/
│       │   └── index.ts
│       └── package.json
└── package.json
```

社区插件由项目根目录 `package.json` 的 `dependencies` 声明，包名还要以 `kokkoro-plugin-` 开头：

```json
{
  "dependencies": {
    "kokkoro-plugin-hitokoto": "^3.0.1"
  }
}
```

Kokkoro 当前不支持插件热更新。添加或更新插件后，请重新启动项目。完整规则请参阅 [插件概述](/develop/overview#loading)。

## 为什么指令参数都是字符串？ {#command-arguments-as-strings}

QQ 聊天框发送的是文本，Kokkoro 会从消息文本中解析指令参数，因此普通参数的类型始终是 `string`，可变参数的类型始终是 `string[]`。

`@kokkoro/core` 理论上可以引入 `<count:number>` 这样的自定义语法，由框架自动转换参数类型。但这种写法不是常见的命令行参数语法，不同框架还可能采用不同的规则，开发者需要额外学习这些差异。

因此，Kokkoro 保留常见的参数写法，由插件根据自己的业务规则完成转换和校验：

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

详细语法参阅 [指令参数](/develop/command#argument-types)。
