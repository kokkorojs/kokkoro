# 指令快捷方式 {#command-shortcuts}

斜杠指令要求用户记住指令名称和参数格式。`shortcut()` 可以为指令添加更接近自然语言的触发方式，匹配成功后仍然执行原来的处理函数。

## 字符串匹配 {#string-matching}

将字符串传给 `shortcut()` 时，只有消息内容与该字符串相同才会触发指令：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', () => 'pong').shortcut('在吗');
};
```

发送 `/ping` 或「在吗」都会执行同一个处理函数：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 在吗</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">pong</ChatMessage>
</ChatPanel>

匹配前，Kokkoro 会移除消息开头的空白、对机器人的提及，以及提及后的空白。因此，群聊中发送「@可可萝 在吗」也能触发上面的快捷方式。

## 正则表达式 {#regular-expressions}

正则表达式可以匹配变化的文本，并通过命名捕获组提取指令参数。下面的指令从「查询北京天气」中提取「北京」，并将它保存到 `context.args.city`：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/天气 <city>', context => `${context.args.city}天气：晴`).shortcut(/^查询(?<city>.+)天气$/);
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 查询北京天气</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">北京天气：晴</ChatMessage>
</ChatPanel>

这段正则表达式可以分为三部分：

- **开头**：`^查询` 要求消息以「查询」开头。
- **城市**：`(?<city>.+)` 将中间的一个或多个字符保存为 `city`。
- **结尾**：`天气$` 要求消息以「天气」结尾。

更多语法参阅 [MDN 正则表达式指南](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions) 和 [命名捕获组](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions/Groups_and_backreferences#%E4%BD%BF%E7%94%A8%E5%91%BD%E5%90%8D%E7%BB%84)。

## 提取必填参数 {#extract-required-arguments}

指令包含必填参数时，正则表达式需要为每个必填参数声明同名的命名捕获组。Kokkoro 会在挂载插件时检查这些捕获组是否存在。

下面的正则表达式可以匹配「查询北京天气」，却没有用命名捕获组将「北京」保存为 `city`：

```typescript
useCommand('/天气 <city>', context => `${context.args.city}天气：晴`).shortcut(/^查询.+天气$/);
```

插件因此无法挂载，终端会提示快捷方式缺少 `city`：

```text
[2026-09-03T00:00:00.000Z] ERROR kokkoro:APP_ID:plugin - 挂载失败 kokkoro-plugin-weather
SyntaxError: Command shortcut is missing required parameters: city
```

字符串快捷方式不能提取参数，因此只适用于没有必填参数的指令。

使用正则表达式时，Kokkoro 能在挂载插件时检查命名捕获组是否存在，但无法预先判断每次匹配得到的内容。

必填参数对应的捕获组需要保证匹配结果不为空。例如，可以使用 `(?<city>.+)`，不要将整个命名捕获组设为可选的 `(?<city>.+)?`，也不要使用能够匹配空内容的 `(?<city>.*)`。

可变参数通过快捷方式触发时，整个捕获结果会作为数组中的一项，不会再次按照空格分隔。例如，`(?<parts>.+)` 捕获「hello world」后，`context.args.parts` 的值是 `['hello world']`。

## 触发方式 {#trigger}

`context.trigger` 记录处理函数的触发方式。用户执行斜杠指令时，它的值是 `'command'`，普通消息匹配快捷方式时则是 `'shortcut'`。

大多数指令不需要读取这个字段。只有需要针对两种触发方式采用不同处理策略时，才需要判断 `context.trigger`。

## 链式调用 {#chaining}

同一条指令可以链式调用多次 `shortcut()`，匹配不同的自然语言表达：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/天气 <city>', context => `${context.args.city}天气：晴`)
    .shortcut(/^查询(?<city>.+)天气$/)
    .shortcut(/^(?<city>.+)天气怎么样$/);
};
```

同一条消息可能同时匹配多个快捷方式。每个命中的快捷方式都会并发调用一次处理函数，因此同一条指令也可能回复多次。如果只需要回复一次，应当避免让不同的正则表达式匹配同一条消息。

插件需要记录运行过程或异常时，可以继续阅读 [日志](/develop/logging)。
