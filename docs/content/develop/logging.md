# 日志 {#logging}

开发插件时，你可以通过日志确认代码是否执行、执行到了哪一步，以及为什么执行失败。日志会显示在运行 Kokkoro 的终端中。

日志与消息回复不同。消息回复会发送给 QQ 用户，日志不会发送给用户。

JavaScript 自带的 `console.log()` 也能向终端输出内容，前面的示例使用它演示基本流程。`useLogger()` 获取的日志记录器还会标记日志等级和插件名称，并根据 Kokkoro 的日志配置决定是否输出。多个插件同时运行时，这些信息可以帮助你区分日志来源。

## 记录日志 {#write-logs}

Kokkoro 提供了 `useLogger()`，用于获取当前插件的日志记录器。请在默认导出函数的外面调用它，并将返回值保存为 `logger`。随后可以在指令处理函数和其他插件代码中使用这个日志记录器。

下面的插件在处理 `/ping` 指令时记录「指令处理中」，回复成功后再记录「指令处理完成」：

```typescript
import { useCommand, useLogger } from '@kokkoro/core';

const logger = useLogger();

export default () => {
  useCommand('/ping', async context => {
    logger.info('指令处理中');
    await context.reply('pong');
    logger.info('指令处理完成');
  });
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /ping</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">pong</ChatMessage>
</ChatPanel>

与此同时，终端会输出下面的日志：

```text
[2026-09-02T10:00:00.000Z] INFO kokkoro:2854205915 - 收到群聊 @ 消息 {
  id: "group-message-id",
  group_openid: "group-openid",
  member_openid: "member-openid",
  content: " /ping",
}
[2026-09-02T10:00:00.000Z] INFO kokkoro:plugin:example - 指令处理中
[2026-09-02T10:00:00.123Z] INFO kokkoro:plugin:example - 指令处理完成
```

其中，**INFO** 是日志等级。第一条日志由 Kokkoro 在收到群聊 @ 消息时输出，后两条日志来自 `kokkoro-plugin-example` 插件。最后一条日志写在 `context.reply()` 之后，因此只有回复成功才会输出。

Kokkoro 只在加载插件模块时提供日志记录器，因此 `useLogger()` 必须写在模块顶层。将它写在默认导出函数、事件回调或指令处理函数中会抛出错误。模块顶层与插件挂载之间的关系参阅 [插件生命周期](/develop/lifecycle)。

## 日志等级 {#levels}

日志分为四个等级。根据一条信息的重要程度，调用对应的方法：

| 等级      | 用途                                   |
| --------- | -------------------------------------- |
| **DEBUG** | 记录仅在调试时需要的详细信息           |
| **INFO**  | 记录插件启动、任务完成等正常运行状态   |
| **WARN**  | 记录需要注意，但不会阻止插件运行的问题 |
| **ERROR** | 记录导致功能执行失败的错误             |

四个等级分别对应以下方法：

```typescript
logger.debug('开始执行任务');
logger.info('任务执行完成');
logger.warn('任务执行时间过长');
logger.error('任务执行失败');
```

Kokkoro 默认输出 **INFO** 及以上等级的日志，因此 `logger.debug()` 默认不会显示。需要查看调试日志时，在 `kokkoro.json` 中将日志等级改为 `debug`：

```json
{
  "logger": {
    "level": "debug"
  }
}
```

修改配置后需要重新启动项目。完整配置说明参阅 [配置文件](/guide/config#logger)。

## 记录数据 {#data}

日志方法可以接收多个值。如果想记录消息 ID，可以在指令处理函数中将说明文字和 `context.id` 一起传入：

```typescript
useCommand('/ping', async context => {
  logger.info('指令处理中', { id: context.id });
  await context.reply('pong');
  logger.info('指令处理完成', { id: context.id });
});
```

对象会跟在说明文字后面输出。这样既能看出发生了什么，也能保留排查问题时需要的数据。

```text
[2026-09-02T10:00:00.000Z] INFO kokkoro:plugin:example - 指令处理中 { id: "group-message-id" }
[2026-09-02T10:00:00.123Z] INFO kokkoro:plugin:example - 指令处理完成 { id: "group-message-id" }
```

## 日志与异常 {#errors}

记录一条 **ERROR** 日志和抛出 `Error` 的作用不同。

`logger.error()` 只记录发生了什么，不会停止 JavaScript 代码。下面两行代码都会执行：

```typescript
logger.error('任务执行失败');
logger.info('继续执行后续代码');
```

如果发生错误后不能继续执行当前函数，请使用 `throw new Error()`。例如，插件调用外部服务前必须读取 `API_KEY`：

```typescript
const { API_KEY } = import.meta.env;

if (!API_KEY) {
  throw new Error('未配置 API_KEY');
}
logger.info('开始请求外部服务');
```

没有配置 `API_KEY` 时，`throw` 会立即停止当前函数，因此最后一行日志不会输出。

Kokkoro 会自动记录没有被 `try...catch` 处理的异常，包括插件加载、挂载以及事件或指令处理过程中的异常。无需在 `throw` 前重复调用 `logger.error()`，否则同一个错误会在终端中出现两次。

如果插件使用 `try...catch` 处理异常并继续运行，Kokkoro 就不会再收到这个异常。需要保留错误信息时，请在 `catch` 中调用 `logger.warn()` 或 `logger.error()`：

```typescript
try {
  await fetch('https://api.example.com/data');
} catch (error) {
  logger.error('请求外部服务失败', error);
}
```
