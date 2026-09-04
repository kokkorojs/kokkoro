# 指令处理 {#commands}

QQ 指令同样来自消息事件。`useCommand()` 封装了这些事件的监听、指令匹配和参数解析，让插件只需要声明指令语法和处理函数。

## 注册指令 {#register-command}

下面的插件注册了 `/ping` 指令，并在收到指令后回复「pong」：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', () => 'pong');
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /ping</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">pong</ChatMessage>
</ChatPanel>

`useCommand()` 接收两个参数。第一个参数声明指令语法，第二个参数是匹配成功后执行的处理函数。处理函数返回的文本会自动回复到当前私聊或群聊。

Kokkoro 要求传给 `useCommand()` 的指令语法以 `/` 开头。斜杠后还必须包含指令名称，因此单独的 `/` 也不是有效语法。下面的 `ping` 缺少 `/` 前缀：

```typescript
useCommand('ping', () => 'pong');
```

TypeScript 会在编辑器中标记这个错误。Kokkoro 还会在挂载插件时检查指令语法，并在终端记录以下错误：

```text
[2026-09-03T00:00:00.000Z] ERROR kokkoro:APP_ID:plugin - 挂载失败 kokkoro-plugin-example
SyntaxError: Command syntax must start with /
```

包含这段代码的插件不会完成挂载，其他插件仍会继续加载。

QQ 开放平台的 [指令面板](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/menu-panel/) 用于在 QQ 客户端中展示指令或链接。用户点击指令后，面板会将配置的 `name` 填入输入框，但不会替 Kokkoro 注册指令。要让面板项触发 `/ping`，需要将它的 `name` 配置为 `/ping`。

`useCommand()` 会处理私聊消息、群聊 @ 消息和已经开启「获取群内全部消息」权限的群消息。同一条指令不需要为不同消息事件重复注册。

同一个 `Bot` 中，每条指令的前缀必须唯一。两个插件都注册 `/ping` 时，后挂载的插件会失败，终端也会记录前缀冲突。

收到未注册的斜杠指令时，Kokkoro 会回复当前 `Bot` 已经注册的指令语法列表。当前 `Bot` 没有注册任何指令时，不会回复。

## 指令上下文 {#command-context}

处理函数可以接收 `context` 参数。它包含当前消息的数据，以及 Kokkoro 为指令添加的 `args` 和 `trigger`。

下面的指令读取消息 ID，并把它回复给用户：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/消息', context => `消息 ID：${context.id}`);
};
```

`context.args` 保存解析后的指令参数，具体用法见 [指令参数](/develop/command-arguments)。`context.trigger` 记录本次处理由斜杠指令还是快捷方式触发，具体用法见 [指令快捷方式](/develop/command-shortcuts#trigger)。

## 回复消息 {#reply-messages}

`context.reply()` 用于向当前会话发送回复。处理函数返回文本时，Kokkoro 会自动调用它，因此下面两种写法的效果相同：

::: code-group

```typescript [返回文本]
useCommand('/ping', () => 'pong');
```

```typescript [调用 reply]
useCommand('/ping', async context => {
  await context.reply('pong');
});
```

:::

只需回复一条文本时，可以直接返回字符串。需要等待发送结果、连续发送多条消息，或发送 QQ 消息对象时，可以调用 `context.reply()`。处理函数没有返回值时，Kokkoro 不会自动回复。

调用 `context.reply()` 后，处理函数应当保持无返回值。下面的写法会把 `reply()` 返回的发送结果再次作为指令返回值，导致机器人发送第二条消息：

```typescript
// 不要这样写
useCommand('/ping', context => context.reply('pong'));
```

需要调用 `reply()` 时，可以使用带花括号的函数体，并通过 `await` 等待消息发送完成，前面的「调用 reply」示例采用的就是这种写法。

返回值不是字符串时，对象和数组会通过 `JSON.stringify()` 转为文本，其他值会通过 `String()` 转为文本：

```typescript
export default () => {
  useCommand('/成员', () => ['镜华', '美美', '未奏希']);

  useCommand('/状态', () => ({
    name: '可可萝',
    protocol: 'websocket',
  }));
};
```

这两条指令会分别回复 `["镜华","美美","未奏希"]` 和 `{"name":"可可萝","protocol":"websocket"}`。它们不会被当作 QQ 消息结构处理。

发送 QQ 消息对象时，需要直接调用 `context.reply()`：

```typescript
useCommand('/ping', async context => {
  await context.reply({ msg_type: 0, content: 'pong' });
});
```

## 异常处理 {#error-handling}

处理函数抛出 `Error` 时，Kokkoro 会把 `error.message` 回复到当前会话，并在终端记录一条 **ERROR** 日志：

```typescript
useCommand('/状态', () => {
  throw new Error('暂时无法查询机器人状态');
});
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /状态</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">暂时无法查询机器人状态</ChatMessage>
</ChatPanel>

终端会同时记录这次异常：

```text
[2026-09-03T00:00:00.000Z] ERROR kokkoro:APP_ID:dispatch - 事件处理失败 Error: 暂时无法查询机器人状态
```

斜杠指令和快捷方式遵循相同的异常处理规则。处理函数应当抛出 `Error`，抛出其他值时，Kokkoro 会将它转换为 `TypeError`，但不会自动回复给用户。有关 Kokkoro 自动记录哪些异常，参阅 [日志与异常](/develop/logging#logging-and-errors)。

必填参数、可选参数和可变参数的声明与解析规则见 [指令参数](/develop/command-arguments)。
