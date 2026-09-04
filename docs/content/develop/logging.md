# 日志 {#logging}

开发插件时，日志可以帮助你确认代码是否执行、执行到了哪一步，以及为什么失败。Kokkoro 会将日志输出到运行项目的终端中。

日志与消息回复不同。消息回复会发送给 QQ 用户，日志不会发送给用户。

`console.log()` 也能向终端输出内容，前面的示例用它演示了基本流程。`useLogger()` 返回的日志记录器还会标明日志等级和插件来源，并根据 Kokkoro 的日志配置过滤输出。这些信息可以帮助开发者在多个插件同时运行时定位日志。

## 记录插件日志 {#write-logs}

`useLogger()` 返回当前插件的日志记录器。它必须在模块顶层调用，也就是默认导出函数之外。将返回值保存为 `logger` 后，插件中的其他代码都可以使用它。

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

收到指令后，终端会输出下面的日志：

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

**INFO** 是日志等级。第一条日志由 Kokkoro 在收到群聊 @ 消息时输出，后两条来自 `example` 插件。最后一条日志写在 `context.reply()` 之后，因此只有回复成功才会出现。

Kokkoro 只能在加载插件模块时判断日志记录器属于哪个插件。因此，将 `useLogger()` 写在默认导出函数、事件回调或指令处理函数中都会抛出错误。模块顶层与插件挂载之间的关系见 [插件生命周期](/develop/lifecycle)。

## 日志等级 {#log-levels}

日志分为四个等级，每个等级适用于不同的情况：

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

修改配置后需要重新启动项目。完整配置见 [配置文件](/guide/config#logger)。

## 为日志附加数据 {#log-data}

日志方法可以接收多个值。如果需要记录消息 ID，可以在指令处理函数中将说明文字和 `context.id` 一起传入：

```typescript
useCommand('/ping', async context => {
  logger.info('指令处理中', { id: context.id });
  await context.reply('pong');
  logger.info('指令处理完成', { id: context.id });
});
```

对象会显示在说明文字后面。说明文字概括发生的事情，对象中保存排查问题时需要的数据。

```text
[2026-09-02T10:00:00.000Z] INFO kokkoro:plugin:example - 指令处理中 { id: "group-message-id" }
[2026-09-02T10:00:00.123Z] INFO kokkoro:plugin:example - 指令处理完成 { id: "group-message-id" }
```

## 日志与异常 {#logging-and-errors}

记录 **ERROR** 日志与抛出 `Error` 的作用不同。

`logger.error()` 只负责记录日志，不会停止代码。下面两行都会执行：

```typescript
logger.error('任务执行失败');
logger.info('继续执行后续代码');
```

如果缺少某项配置会导致插件无法运行，可以抛出 `Error`。例如，下面的插件依赖 `API_KEY`：

```typescript
import { useLogger } from '@kokkoro/core';

const logger = useLogger();
const { API_KEY } = import.meta.env;

if (!API_KEY) {
  throw new Error('未配置 API_KEY');
}
logger.info('插件配置已读取');

export default () => {};
```

没有配置 `API_KEY` 时，插件会停止加载，后面的日志不会输出，插件也不会挂载到 `Bot`。终端会记录加载失败的原因：

```text
[2026-09-02T10:00:00.000Z] ERROR kokkoro:plugin - 加载失败 kokkoro-plugin-example
error: 未配置 API_KEY
```

Kokkoro 会自动记录没有被 `try...catch` 处理的插件加载、挂载、QQ 事件和指令异常。无需在 `throw` 前重复调用 `logger.error()`，否则同一个错误会在终端中出现两次。

如果插件在 `catch` 中处理异常，并且没有再次抛出，Kokkoro 就不会自动记录该异常。需要保留错误信息时，可以调用 `logger.warn()` 或 `logger.error()`：

```typescript
try {
  await fetch('https://api.example.com/data');
} catch (error) {
  logger.error('请求外部服务失败', error);
}
```

插件代码在加载、挂载和清理阶段的执行顺序见 [插件生命周期](/develop/lifecycle)。
