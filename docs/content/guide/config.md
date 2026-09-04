# 配置文件 {#configuration}

`kokkoro.json` 位于项目根目录，用于设置 QQ 机器人的凭证、接入方式、HTTP 服务和日志等级。Kokkoro 从运行命令的目录读取这个文件，因此需要在项目根目录中启动项目。修改配置后，需要重新启动项目。

以下最小配置会启动一个 WebSocket 机器人：

```json
{
  "$schema": "https://kokkoro.js.org/schema.json",
  "protocol": "websocket",
  "bots": [
    {
      "appId": "APP_ID",
      "clientSecret": "CLIENT_SECRET"
    }
  ]
}
```

示例中的 `APP_ID` 和 `CLIENT_SECRET` 需要替换为 [QQ 机器人管理后台](https://q.qq.com/qqbot/dashboard) 中的机器人凭证。`$schema` 不参与项目运行，只为编辑器提供字段提示和配置检查。Kokkoro 启动时不会根据该 Schema 校验配置，因此编辑器提示配置错误时，应当先修正对应字段。

::: warning
ClientSecret 是敏感凭证。不要向他人公开，也不要将包含真实 ClientSecret 的配置提交到公开仓库。
:::

## 顶层配置 {#top-level-config}

| 字段         | 类型                     | 必填 | 说明                                 |
| ------------ | ------------------------ | ---- | ------------------------------------ |
| **$schema**  | string                   | 否   | JSON Schema 地址，用于提供编辑器提示 |
| **protocol** | "websocket" \| "webhook" | 是   | 所有机器人的默认接入方式             |
| **server**   | object                   | 否   | HTTP 服务配置                        |
| **logger**   | object                   | 否   | 日志输出配置                         |
| **bots**     | array                    | 是   | 机器人配置列表，可以为空数组         |

最小配置省略了 `server` 和 `logger`，Kokkoro 会分别使用端口 `3000` 和日志等级 `info`。

## QQ 接入方式 {#protocols}

顶层的 `protocol` 设置所有机器人的默认接入方式，可选值如下：

- **WebSocket**：主动连接 QQ 服务，适合本地开发和能够持续运行的部署环境。
- **WebHook**：通过 HTTP 路由接收 QQ 推送，需要一个可以从公网访问的 HTTPS 地址。

选择 WebHook 时，还需要在对应的机器人配置中设置 `webhook.path`。具体写法参阅 [WebHook 回调路径](#webhook-path)。

## 机器人配置 {#bots}

`bots` 是一个数组，每个对象表示一个 QQ 机器人：

| 字段             | 类型                     | 必填                      | 说明                      |
| ---------------- | ------------------------ | ------------------------- | ------------------------- |
| **appId**        | string                   | 是                        | QQ 机器人的 AppID         |
| **clientSecret** | string                   | 是                        | QQ 机器人的 ClientSecret  |
| **protocol**     | "websocket" \| "webhook" | 否                        | 覆盖顶层的默认接入方式    |
| **webhook**      | object                   | 当前机器人使用 WebHook 时 | 当前机器人的 WebHook 配置 |

同一个项目可以运行多个机器人。机器人对象中的 `protocol` 可以覆盖顶层的默认值，没有设置时则使用顶层的 `protocol`。

下面的配置让第一个机器人使用默认的 WebSocket，第二个机器人改用 WebHook：

```json
{
  "protocol": "websocket",
  "bots": [
    {
      "appId": "APP_ID",
      "clientSecret": "CLIENT_SECRET"
    },
    {
      "appId": "APP_ID",
      "clientSecret": "CLIENT_SECRET",
      "protocol": "webhook",
      "webhook": {
        "path": "/callback"
      }
    }
  ]
}
```

示例中的两个机器人使用了相同的占位符。实际配置时，每个对象都要填写对应机器人的 AppID 和 ClientSecret。

暂时不需要运行机器人时，`bots` 也可以设置为空数组。Kokkoro 仍会启动 HTTP 服务。

## WebHook 回调路径 {#webhook-path}

使用 WebHook 的机器人必须设置 `webhook.path`。该字段只填写回调地址中的路径部分，例如 `/callback`，不填写包含域名的完整网址：

```json
{
  "protocol": "webhook",
  "bots": [
    {
      "appId": "APP_ID",
      "clientSecret": "CLIENT_SECRET",
      "webhook": {
        "path": "/callback"
      }
    }
  ]
}
```

`path` 必须以 `/` 开头。同一个项目中的 WebHook 机器人共用 HTTP 服务，每个机器人需要使用不同的路径。

`kokkoro.json` 只保存 `/callback` 这样的回调路径，QQ 机器人管理后台则需要填写可以从公网访问的完整 HTTPS 地址。假设项目部署在 `https://bot.example.com`，完整的回调地址就是：

```text
https://bot.example.com/callback
```

在这个示例中，`kokkoro.json` 中填写 `/callback`，QQ 机器人管理后台中填写 `https://bot.example.com/callback`。

## HTTP 服务 {#http-server}

`server` 用于设置 Kokkoro 自带的 HTTP 服务：

```json
{
  "server": {
    "port": 3000
  }
}
```

| 字段     | 类型    | 默认值 | 说明                                                         |
| -------- | ------- | ------ | ------------------------------------------------------------ |
| **port** | integer | 3000   | 监听端口，设为 0 时由系统选择可用端口，其余取值为 1 到 65535 |

无论是否配置 WebHook 机器人，Kokkoro 都会启动这个服务。访问根路径时会返回「Ciallo～(∠·ω< )⌒★」。

## 日志配置 {#logger}

`logger.level` 设置终端输出的最低日志等级：

```json
{
  "logger": {
    "level": "debug"
  }
}
```

| 字段      | 类型                                   | 默认值 | 说明                   |
| --------- | -------------------------------------- | ------ | ---------------------- |
| **level** | "debug" \| "info" \| "warn" \| "error" | "info" | 输出该等级及以上的日志 |

`debug` 会显示插件挂载、身份验证、QQ API 请求、连接状态和事件分发等详细信息，适合在开发时排查问题。插件中的日志用法参阅 [日志](/develop/logging)。

::: warning
常规运行日志可能包含 OpenID 和消息正文。将日志等级设为 `debug` 后，QQ API 请求日志还可能包含 Access Token。向他人提供日志前，需要先移除凭证和用户数据。
:::

## 在 VS Code 中启用配置提示 {#vscode-intellisense}

VS Code 1.109 为远程 JSON Schema 增加了信任列表。如果 VS Code 尚未信任 kokkoro.js.org，`$schema` 所在行可能显示「无法加载架构，位置不受信任」。这不是 Schema 内容或网站证书错误。

将光标移到 `$schema` 所在行，按 **Cmd + .**（macOS）或 **Ctrl + .**（Windows 和 Linux），然后依次选择 **Configure Trusted Domains** 和 **Trust Domain: https://kokkoro.js.org**。

也可以打开命令面板，运行 **Preferences: Open User Settings (JSON)**，再添加以下配置：

```json
{
  "json.schemaDownload.trustedDomains": {
    "https://kokkoro.js.org": true
  }
}
```

VS Code 在 [#287639](https://github.com/microsoft/vscode/pull/287639) 中引入了该设置。[#288709](https://github.com/microsoft/vscode/issues/288709) 记录了内置 Schema 被错误拦截的问题。
