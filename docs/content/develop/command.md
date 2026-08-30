# 指令参数 {#command-arguments}

Kokkoro 会根据指令语法解析聊天消息，并将参数保存在 `context.args` 中。本页介绍参数的声明、读取与类型转换。

QQ 要求机器人指令以 `/` 开头，这种设计在机器人平台中十分常见，Telegram、Discord 等平台的机器人也同样使用斜杠指令。这样设计可以让用户在聊天框输入斜杠时，客户端能识别正在输入指令，并显示可用指令及其说明，方便用户查找和选择。QQ 的指令菜单可以通过 [指令面板](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/menu-panel/) 配置。

## 参数语法 {#syntax}

你可以通过命令行语法（command line syntax）为指令添加参数，例如 `<arg>`、`[arg]`、`<args>...` 和 `[args]...`。

必填参数必须位于可选参数之前，可变参数必须位于末尾。

```typescript {4}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/复读 <part>', context => context.args.part);
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 ciallo</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">ciallo</ChatMessage>
</ChatPanel>

指令参数会全部存储在 `context.args` 中。如果指令没有声明任何参数，那么 `args` 的值是 `{}` 空对象。

## 必填参数 {#required-arguments}

如果指令缺少必填参数，Kokkoro 会回复正确的指令语法。

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">缺少指令参数，有效语句为："/复读 &lt;part>"</ChatMessage>
</ChatPanel>

## 可选参数 {#optional-arguments}

如果你为指令添加了可选参数（`[arg]`），那么当指令未传入参数时，该字段的值是 `undefined`，这点需要注意。

```typescript {4}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/复读 [part]', context => String(context.args.part));
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">undefined</ChatMessage>
</ChatPanel>

## 多余参数 {#extra-arguments}

Kokkoro 会使用空格、换行等空白字符分隔指令中的参数。普通参数只接收一个值，后续没有对应声明的参数会被**忽略**。

在命令行中，POSIX Shell 允许使用引号将包含空格的内容作为一个整体参数，部分机器人框架也支持这种写法。但 Kokkoro 没有沿用这套规则，引号只会作为普通字符保留：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 hello world</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">hello</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 "hello world"</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">"hello</ChatMessage>
</ChatPanel>

带引号的指令仍会被拆成 `"hello` 和 `world"`，`<part>` 只接收传入的第一个参数。

POSIX Shell 的引号和转义规则面向命令行工具，用户需要先理解参数边界才能正确调用指令。而 QQ 机器人则通过聊天窗口进行交流，两者在使用场景上就存在着明显差异。

Kokkoro 的设计理念，是让没有编程基础的用户也能轻松体验机器人带来的乐趣。如果用户为了向机器人发送一条普通指令，还要先学习 POSIX Shell 语法，无疑会增加额外的学习成本。

如果需要接收后续的全部参数，可以使用可变参数。

## 可变参数 {#variadic-arguments}

可变参数（`<args>...`、`[args]...`）会将后续参数依次存入数组，这与 JavaScript 中的 [Rest 语法](https://zh.javascript.info/rest-parameters-spread) 十分相似。

```typescript {4}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/复读 <parts>...', context => context.args.parts.join(' '));
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 hello world</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">hello world</ChatMessage>
</ChatPanel>

`useCommand()` 针对可变参数做了严格的语法校验。与 JavaScript 一样，可变参数只能放在**参数的最后面**，不然会导致插件无法被正常挂载。

```typescript {4}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/来点涩图 <tags>...', context => context.args.tags);
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /来点涩图 贫乳 萝莉 白丝</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">["贫乳","萝莉","白丝"]</ChatMessage>
</ChatPanel>

::: warning 不可以涩涩
这里只是为了趣味性才举了这么一个例子，你可别真的去做一个涩图插件，连指令都过不了审。~~别问我是怎么知道的。~~
:::

值得注意的是，必填可变参数的非空校验依然存在，而可选可变参数在不传入任何内容的时候，其变量的值是 `[]` 空数组，而不是 `undefined`。

## 参数类型 {#argument-types}

在 QQ 中，所有消息都是通过聊天窗口下半部分的输入框发送的，我们可以将其视为一个 `textarea` 元素。

因此，`args` 中的普通参数类型为 `string`，可变参数类型为 `string[]`。

```typescript {4}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/复读 <part>', context => JSON.stringify(context.args.part));
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 114514</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">"114514"</ChatMessage>
</ChatPanel>

在这里，`part` 参数的值是 `"114514"` 字符串，而不是数字。经过 `JSON.stringify()` 处理后，它会变成 `'"114514"'`，最终回复为 `"114514"`。

Kokkoro 将数据处理交给开发者，设计原因可以参阅 [为什么指令参数都是字符串？](/about/faq#command-arguments-as-strings)。如果需要转换参数类型，可以直接使用 JavaScript 提供的方法。

```typescript {6-8}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/复读 <part>', context => {
    const { part } = context.args;
    const number = Number(part);

    return Number.isNaN(number) ? JSON.stringify(part) : JSON.stringify(number);
  });
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 114514</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">114514</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 哼哼哼啊啊啊啊啊啊啊</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">"哼哼哼啊啊啊啊啊啊啊"</ChatMessage>
</ChatPanel>

## 异常处理 {#errors}

指令处理函数抛出 `Error` 时，Kokkoro 会将 `error.message` 回复给消息来源，并在日志中记录该错误。处理函数不得抛出字符串、对象或其他非 `Error` 值。

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', () => {
    throw new Error('请求超时');
  });
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /ping</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">请求超时</ChatMessage>
</ChatPanel>

终端会同时输出错误日志：

```text
[2026-08-26T02:58:00.000Z] ERROR kokkoro:APP_ID:dispatch - 事件处理失败 Error: 请求超时
```

## 类型推导 {#type-inference}

只要为 `useCommand()` 传入字符串字面量，TypeScript 就会根据指令语法自动推导 `args` 的字段与类型，不需要手动标注泛型。

```typescript {4}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/天气 <city>', context => `${context.args.city}天气：晴`);
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /天气 北京</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">北京天气：晴</ChatMessage>
</ChatPanel>

## 快捷方式 {#shortcuts}

在「多余参数」一栏中，我们介绍了 Kokkoro 对参数解析的设计哲学。尽管 Kokkoro 没有沿用 POSIX Shell 的引号和转义规则，但斜杠指令在实际使用中仍然接近命令行交互。

例如，上面的天气指令要求用户按照 `/天气 北京` 的形式输入消息。不熟悉命令行的用户还需要记住指令名称和参数顺序，而使用 `shortcut()` 可以为同一条指令添加更接近自然语言的快捷方式，让用户按照日常表达触发指令。

### 字符串 {#string}

将字符串传给 `shortcut()` 时，只有消息内容与字符串完全相同才会触发指令：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', () => 'pong').shortcut('在吗');
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">在吗</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">pong</ChatMessage>
</ChatPanel>

发送 `/ping` 与「在吗」都会执行同一个处理函数。

### 正则表达式 {#regular-expressions}

字符串只能匹配一种固定内容。需要从自然语言中提取参数时，可以把正则表达式传给 `shortcut()`，再用命名捕获组保存参数：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/天气 <city>', context => `${context.args.city}天气：晴`).shortcut(/^查询(?<city>.+)天气$/);
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">查询北京天气</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">北京天气：晴</ChatMessage>
</ChatPanel>

两侧的 `/` 表示这是一段**正则表达式**，内部规则可以拆成三部分：

- **^查询** 要求消息以「查询」开头。
- **(?&lt;city&gt;.+)** 将中间的一个或多个字符保存为名为 `city` 的参数。
- **天气$** 要求消息以「天气」结尾。

命名捕获组 `city` 必须与指令参数 `<city>` 同名。收到「查询北京天气」时，`context.args.city` 的值就是 `"北京"`。

更多语法参阅 [MDN 正则表达式指南](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions) 和 [命名捕获组](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions/Groups_and_backreferences#%E4%BD%BF%E7%94%A8%E5%91%BD%E5%90%8D%E7%BB%84)。

### 链式调用 {#chaining}

同一条指令可以链式调用多次 `shortcut()`，以匹配不同的自然语言表达：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/天气 <city>', context => `${context.args.city}天气：晴`)
    .shortcut(/^查询(?<city>.+)天气$/)
    .shortcut(/^(?<city>.+)天气怎么样$/);
};
```
