# kokkoro

[![npm downloads](https://img.shields.io/npm/dm/kokkoro?style=flat-square&labelColor=FAFAFA&color=CB3837&logo=npm&logoColor=CB3837)](https://www.npmjs.com/package/kokkoro)
[![license](https://img.shields.io/github/license/kokkorojs/kokkoro?style=flat-square&labelColor=FAFAFA&color=181717&logo=github&logoColor=181717)](https://github.com/kokkorojs/kokkoro/blob/master/LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-%5E6.0.3-3178c6?style=flat-square&labelColor=FAFAFA&logo=typescript&logoColor=3178c6)](https://www.typescriptlang.org)

Kokkoro 仅支持在 Bun 中运行。你可以在同一个项目中管理多个 QQ 机器人和插件。每个机器人可以通过 WebSocket 或 WebHook 接入 QQ 服务。

## 安装

```shell
bun add kokkoro
```

## 创建配置

在项目根目录创建 `kokkoro.json`：

```json
{
  "$schema": "https://kokkoro.js.org/schema.json",
  "protocol": "websocket",
  "server": {
    "port": 3000
  },
  "logger": {
    "level": "info"
  },
  "bots": [
    {
      "appId": "APP_ID",
      "clientSecret": "CLIENT_SECRET"
    }
  ]
}
```

`protocol` 设置所有机器人的默认接入方式。单个机器人也可以使用自己的 `protocol` 配置项：

```json
{
  "protocol": "websocket",
  "bots": [
    {
      "appId": "WEBSOCKET_APP_ID",
      "clientSecret": "WEBSOCKET_CLIENT_SECRET"
    },
    {
      "appId": "WEBHOOK_APP_ID",
      "clientSecret": "WEBHOOK_CLIENT_SECRET",
      "protocol": "webhook",
      "webhook": {
        "path": "/webhook"
      }
    }
  ]
}
```

`server.port` 设置 HTTP 服务的端口，默认值为 `3000`。访问 `http://localhost:3000/` 会返回 `Ciallo～(∠·ω< )⌒★`。

所有 WebHook 机器人共用该服务，每个 `webhook.path` 必须唯一。`bots` 可以是空数组，Kokkoro 仍会启动 HTTP 服务并保持运行。

## 启动

创建 `main.ts`：

```typescript
import { run } from 'kokkoro';

await run();
```

运行入口文件：

```shell
bun run main.ts
```

`run()` 读取当前工作目录的 `kokkoro.json`，加载插件，并启动配置中的全部机器人。某个 WebSocket 机器人连接失败时，其他机器人仍会继续启动，不会终止进程。

## 设置日志

`logger.level` 支持 `debug`、`info`、`warn` 和 `error`，默认值为 `info`。

Kokkoro 使用 [Annal](https://github.com/xueelf/annal) 将日志输出到终端。`debug` 日志包含插件挂载、鉴权、OpenAPI、WebSocket、WebHook 和 Dispatch 的详细信息。

插件加载、挂载和执行过程中抛出的错误都会写入日志。

## 添加插件

Kokkoro 会加载项目插件和社区插件。

### 添加项目插件

将每个插件放在 `plugins` 的一级子目录中：

```text
./
├── plugins/
│   └── example/
│       └── index.ts
├── kokkoro.json
├── main.ts
└── package.json
```

项目插件可以不提供 `package.json` 文件。没有该文件时，Bun 会按照 [模块解析规则](https://bun.com/docs/runtime/module-resolution) 查找 `index.ts` 等入口文件。插件需要声明依赖或发布到 npm 时，再添加标准的 `package.json`。

插件使用 `package.json` 中的 `name` 作为标识。项目插件没有 `package.json` 时，则使用一级子目录名称。

### 安装社区插件

社区插件的包名以 `kokkoro-plugin-` 开头。使用 `bun add` 将插件添加到项目的 `dependencies`：

```shell
bun add kokkoro-plugin-example
```

插件自动加载的范围仅限 `package.json#dependencies` 中包名以 **kokkoro-plugin-** 开头的包，不会遍历 `node_modules` 查找其他插件。

插件按照项目插件、社区插件的顺序加载。项目插件按照文件夹路径排序，社区插件按照包名排序。每个插件模块只导入一次，默认导出的插件函数会接收当前 Bot，并挂载到配置中的每个机器人。

完成插件加载和挂载后，Kokkoro 才会启动 HTTP 服务并建立 WebSocket 连接。某个插件加载或挂载失败时，Kokkoro 会记录错误，继续处理其他插件并启动机器人。

插件的编写方式和资源清理规则请阅读 [`@kokkoro/core` 插件文档](https://github.com/kokkorojs/kokkoro/tree/master/packages/core#插件)。

## 运行示例

[`examples`](./examples) 包含一个入口文件和 Ping、Echo、Eval 三个项目插件。填写 `examples/kokkoro.json` 中的机器人配置，然后运行：

```shell
bun run ./examples/main.ts
```
