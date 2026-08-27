# 配置文件

Kokkoro 从当前工作目录读取 `kokkoro.json`，并根据其中的配置管理 HTTP 服务和多个 QQ 机器人。配置文件只在启动时读取，修改后需要重新启动项目。

在文件中添加 `$schema`，编辑器便可以提示可用字段，并检查字段类型和取值。

下面的配置会通过 WebSocket 和 WebHook 分别运行一个机器人。

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
      "appId": "WEBSOCKET_APP_ID",
      "clientSecret": "WEBSOCKET_CLIENT_SECRET"
    },
    {
      "appId": "WEBHOOK_APP_ID",
      "clientSecret": "WEBHOOK_CLIENT_SECRET",
      "protocol": "webhook",
      "webhook": {
        "path": "/callback"
      }
    }
  ]
}
```

## 顶层配置

| 字段       | 类型                       | 必填 | 说明                                 |
| ---------- | -------------------------- | ---- | ------------------------------------ |
| `$schema`  | `string`                   | 否   | JSON Schema 地址，用于提供编辑器提示 |
| `protocol` | `"websocket" \| "webhook"` | 是   | 所有机器人的默认接入方式             |
| `server`   | `object`                   | 否   | HTTP 服务配置                        |
| `logger`   | `object`                   | 否   | 日志输出配置                         |
| `bots`     | `array`                    | 是   | 需要运行的机器人，可以为空数组       |

## 接入方式

`protocol` 设置所有机器人的默认接入方式。

- `websocket` 主动连接 QQ 服务，适合本地开发和能够保持进程运行的部署环境。
- `webhook` 通过 HTTP 路由接收 QQ 推送，需要可以从公网访问的服务地址。

单个机器人可以通过自己的 `protocol` 覆盖顶层配置。因此，同一个项目可以同时运行 WebSocket 和 WebHook 机器人。

## HTTP 服务

`server` 用于设置 Kokkoro HTTP 服务。

| 字段   | 类型      | 默认值 | 说明                                |
| ------ | --------- | ------ | ----------------------------------- |
| `port` | `integer` | `3000` | 监听端口，取值范围为 `0` 到 `65535` |

无论是否配置机器人，Kokkoro 都会启动 HTTP 服务。访问服务根路径时会返回 `Ciallo～(∠·ω< )⌒★`。

## 日志

`logger` 用于设置终端日志的输出等级。

| 字段    | 类型                                     | 默认值   | 说明                   |
| ------- | ---------------------------------------- | -------- | ---------------------- |
| `level` | `"debug" \| "info" \| "warn" \| "error"` | `"info"` | 输出该等级及以上的日志 |

`debug` 日志包含插件挂载、身份验证、QQ 接口调用、连接状态和事件分发的详细信息。

Kokkoro 会将插件中**未处理的错误**写入日志。如果插件需要回复用户或继续执行，请在插件中捕获并处理错误。

## 机器人

`bots` 中的每个对象表示一个 QQ 机器人。

| 字段           | 类型                       | 必填            | 说明                     |
| -------------- | -------------------------- | --------------- | ------------------------ |
| `appId`        | `string`                   | 是              | QQ 机器人的 AppID        |
| `clientSecret` | `string`                   | 是              | QQ 机器人的 ClientSecret |
| `protocol`     | `"websocket" \| "webhook"` | 否              | 覆盖顶层的默认接入方式   |
| `webhook`      | `object`                   | 使用 WebHook 时 | 该机器人的 WebHook 配置  |

`appId` 和 `clientSecret` 可以在 [QQ 机器人管理后台](https://q.qq.com/qqbot/dashboard) 中获取。

如果暂时不需要运行机器人，可以使用空数组。HTTP 服务仍会正常启动。

```json
{
  "protocol": "websocket",
  "bots": []
}
```

## WebHook

使用 WebHook 的机器人必须设置 `webhook.path`。

```json
{
  "protocol": "webhook",
  "server": {
    "port": 3000
  },
  "bots": [
    {
      "appId": "BOT_APP_ID",
      "clientSecret": "BOT_CLIENT_SECRET",
      "webhook": {
        "path": "/callback"
      }
    }
  ]
}
```

`path` 必须以 `/` 开头。同一个项目中的所有 WebHook 机器人共用 HTTP 服务，因此每个机器人必须使用不同的路径。

Kokkoro 只管理 HTTP 服务和回调路径，不需要在配置文件中填写域名。部署完成后，将公网地址与 `path` 组成完整的回调地址，再填写到 QQ 机器人管理后台。例如，公网地址为 `https://bot.example.com`，`path` 为 `/callback`，对应的回调地址就是 `https://bot.example.com/callback`。
