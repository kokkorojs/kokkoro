# 配置文件

::: warning TODO
不定时更新
:::

## server.port

- **类型：**`number`
- **默认：**`2333`

::: warning TODO
暂未支持
:::

Kokkoro 1 时期的历史遗留，启动项目后会监听该端口号，用于 web 服务的访问。重构 Kokkoro 2 后暂未支持，未来可期。

## server.domain

- **类型：**`string`
- **默认：**`'http://localhost'`

::: warning TODO
暂未支持
:::

Kokkoro 1 时期的历史遗留，启动项目后会根据端口号返回完整的 http 网址，用于 web 服务的访问。重构 Kokkoro 2 后暂未支持，未来可期。

## plugins_dir

- **类型：**`string`
- **默认：**`'plugins'`

在项目启动时，Kokkoro 会自动检索并挂载 `node_modules` 和 `plugins_dir` 所配置的目录，这两个文件夹下的所有插件。

其中 `node_modules` 无法更改，会将 `kokkoro-plugin` 前缀名的模块视为一个插件。而 `plugins_dir` 没有命名限制，会将目录下的所有文件视为插件。

## log_level

- **类型：**`LogLevel`

```typescript
type LogLevel = 'OFF' | 'FATAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE' | 'ALL';
```

- **默认：**`'INFO'`

日志等级，可参考 [log4js](https://www.npmjs.com/package/log4js) 文档。若 bots 中也配置了 `log_level`，遵循就近原则。

## events

- **类型：**`IntentEvent[]`

```typescript {7}
enum Intent {
  GUILDS = 1 << 0,
  GUILD_MEMBERS = 1 << 1,
  GUILD_MESSAGES = 1 << 9,
  GUILD_MESSAGE_REACTIONS = 1 << 10,
  DIRECT_MESSAGE = 1 << 12,
  GROUP_MESSAGES = 1 << 25,
  INTERACTION = 1 << 26,
  MESSAGE_AUDIT = 1 << 27,
  FORUMS_EVENT = 1 << 28,
  AUDIO_ACTION = 1 << 29,
  PUBLIC_GUILD_MESSAGES = 1 << 30,
}

type IntentEvent = keyof typeof Intent;
```

机器人事件监听，可参考 [QQ 机器人](https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/interface-framework/event-emit.html#%E4%BA%8B%E4%BB%B6%E8%AE%A2%E9%98%85Intents) 官方文档。若 bots 中也配置了 `events`，遵循就近原则。

需要注意的是，Intent `1 << 25` 是 QQ 群消息事件，但文档中并未说明，我参考 `GUILD_MEMBERS` 事件，将其命名为了 `GROUP_MESSAGES`。这并不是官方命名，未来可能会发生变化。

## sandbox

- **类型：**`boolean`
- **默认：**`false`

是否处于沙箱场景（只会收到测试频道的事件，且调用 API 仅能操作测试频道），若 bots 中也配置了 `sandbox`，遵循就近原则。

## bots

- **类型：**`BotConfig[]`

```typescript
interface ClientConfig {
  appid: string;
  token: string;
  secret: string;
  events: IntentEvent[];
  max_retry?: number;
  log_level?: LogLevel;
}

interface BotConfig extends ClientConfig {
  plugins?: string[];
}
```

Kokkoro 是基于 [Amesu](https://github.com/xueelf/amesu) SDK 开发的，`BotConfig` 与其基本保持一致，在此基础上仅添加了 `plugins` 字段。

`plugins` 传入字符串数组（插件的 `metadata.name`），用来屏蔽部分插件服务。如果不传入，则默认所有已挂载的插件会对该机器人生效。

## kokkoro.json

项目启动后尽量避免编辑器直接修改配置文件，你改了也不会热更新，需要重新启动服务。

```json
{
  "server": {
    "port": 2333,
    "domain": "http://localhost"
  },
  "plugins_dir": "plugins",
  "log_level": "INFO",
  "events": [],
  "bots": [
    {
      "appid": "1145141919",
      "token": "38bc73e16208135fb111c0c573a44eaa",
      "secret": "6208135fb111c0c5",
      "plugins": []
    }
  ]
}
```
