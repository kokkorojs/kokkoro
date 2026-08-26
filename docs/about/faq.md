# 常见问题

## Kokkoro、Core 和 Chobits 有什么区别？

**Chobits** 是直接对接 QQ 官方服务的 JavaScript SDK，负责事件通信和 QQ 接口调用。

**`@kokkoro/core`** 在 Chobits 的基础上提供 `Bot`、Hook 插件系统和指令 API。它适合需要自行管理机器人和插件生命周期的开发者。

**Kokkoro** 是完整的机器人框架。它通过配置文件管理多个机器人，自动发现和挂载插件，并提供 CLI、日志和 HTTP 服务。大部分开发者可以直接从 Kokkoro 开始。

## Kokkoro 可以在 Node.js 中运行吗？

Kokkoro **只支持 Bun**。框架会直接运行 TypeScript 源码，并使用 Bun 管理插件、配置文件和 HTTP 服务。

`@kokkoro/core` 本身不依赖 Bun API。如果只需要 Core，可以在 Node.js 中安装 [tsx](https://github.com/privatenumber/tsx) 运行 TypeScript 源码。

## WebSocket 和 WebHook 应该怎么选？

**WebSocket** 会主动连接 QQ 服务，适合本地开发和能够持续运行的服务器。首次使用 Kokkoro 时，建议选择 WebSocket。

**WebHook** 通过 HTTP 路由接收 QQ 推送，需要公网环境。部署 WebHook 时，还要在 QQ 机器人管理后台填写完整的回调地址。

同一个项目可以同时使用两种接入方式，详情参阅 [配置文件](/guide/config#接入方式)。

## 旧版插件可以继续使用吗？

Kokkoro v3 保留了主要的 Hook 写法，但调整了插件结构和部分 API。旧版插件需要完成适配后再使用，安装社区插件前请确认它已经支持 Kokkoro v3。

## 为什么插件没有自动加载？

项目插件必须放在 `plugins` 的一级子目录中。社区插件必须安装在项目的 `dependencies`，包名还要以 `kokkoro-plugin-` 开头。

Kokkoro 当前不支持插件热更新。添加或更新插件后，请重新启动项目。完整规则请参阅 [插件概述](/develop/overview#加载规则)。

## 为什么指令参数都是字符串？

QQ 聊天框发送的是文本，Kokkoro 会从消息文本中解析指令参数，因此普通参数的类型始终是 `string`，可变参数的类型始终是 `string[]`。

Core 不会猜测参数代表数字、布尔值或其他类型。插件可以根据自己的业务规则完成转换和校验，详情参阅 [指令参数](/develop/command#参数类型)。
