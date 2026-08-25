# 参数获取

## 语法

你可以通过命令行语法（command line syntax），来为指令添加参数，例如：[arg]、[...args]、&lt;arg>、&lt;...args>。

::: code-group

```typescript [Hook] {5}
import { Metadata, useCommand } from '@kokkoro/core';

export const metadata: Metadata = { … };
export default function Example() {
  useCommand('/复读 <message>', ctx => ctx.query.message);
}
```

```typescript [Decorator] {5}
import { Command, CommandContext, Plugin } from '@kokkoro/core';

@Plugin({ … })
export default class Example {
  @Command('/复读 <message>')
  replayMessage(ctx: CommandContext) {
    return ctx.query.message;
  }
}
```

:::

指令参数会全部存储在 `ctx.query` 中，需要注意的是，如果指令没提供任何**命令行参数语法**，那么 `query` 的值是 `null`，而不是 `{}` 空对象。

## 必选参数

如果你为指令添加了必填参数（&lt;arg>），当参数不匹配的时候，就会自动发送语法提示。

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/复读</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">缺少指令参数，有效语句为："/复读 &lt;message>"</ChatMessage>
</ChatPanel>

## 可选参数

如果你为指令添加了可选参数（[arg]），那么当指令未传入参数时，该字段的值是 `null` 而不是 `undefined`，这点需要注意。

::: code-group

```typescript [Hook] {5}
import { Metadata, useCommand } from '@kokkoro/core';

export const metadata: Metadata = { … };
export default function Example() {
  useCommand('/复读 [message]', ctx => ctx.query.message);
}
```

```typescript [Decorator] {5}
import { Command, CommandContext, Plugin } from '@kokkoro/core';

@Plugin({ … })
export default class Example {
  @Command('/复读 [message]')
  replayMessage(ctx: CommandContext) {
    return ctx.query.message;
  }
}
```

:::

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/复读</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">null</ChatMessage>
</ChatPanel>

## 可变参数

可变参数（&lt;...args>、[...args]）会将后续的**所有内容**全部追加至数组中，这与 JavaScript 中的 [Rest 语法](https://zh.javascript.info/rest-parameters-spread) 十分相似。

`command` 针对可变参数做了严格的语法校验，与 JavaScript 一样，它们都只能放在**参数的最后面**，不然会导致插件无法被正常挂载。

::: code-group

```typescript [Hook] {5}
import { Metadata, useCommand } from '@kokkoro/core';

export const metadata: Metadata = { … };
export default function Example() {
  useCommand('/来点涩图 <...tags>', ctx => ctx.query.tags);
}
```

```typescript [Decorator] {5}
import { Command, CommandContext, Plugin } from '@kokkoro/core';

@Plugin({ … })
export default class Example {
  @Command('/来点涩图 <...tags>')
  sendEroImage(ctx: CommandContext) {
    return ctx.query.tags;
  }
}
```

:::

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /来点涩图 贫乳 萝莉 白丝</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">["贫乳", "萝莉", "白丝"]</ChatMessage>
</ChatPanel>

::: warning 不可以涩涩
这里只是为了趣味性才举了这么一个例子，你可别真的去做一个涩图插件，连指令都过不了审。~~别问我是怎么知道的~~
:::

值得注意的是，必选可变参数的非空校验依然存在，而可选可变参数在不传入任何内容的时候，其变量的值是 `[]` 空数组，而不是 `null`。

## 参数类型

在 QQ 中，所有消息都是通过聊天窗口下半部分的输入框发送的，我们可以将其视作为一个 `textarea` 元素。

而 `query` 中的参数字段，又全部都是通过消息文本解析得到的，也就是说，我们解析得到的所有数据，其实全部都是字符串。

::: code-group

```typescript [Hook] {5}
import { Metadata, useCommand } from '@kokkoro/core';

export const metadata: Metadata = { … };
export default function Example() {
  useCommand('/复读 <message>', ctx => JSON.stringify(ctx.query.message));
}
```

```typescript [Decorator] {7}
import { Command, CommandContext, Plugin } from '@kokkoro/core';

@Plugin({ … })
export default class Example {
  @Command('/复读 <message>')
  replayMessage(ctx: CommandContext) {
    return JSON.stringify(ctx.query.message);
  }
}
```

:::

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 114514</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">"114514"</ChatMessage>
</ChatPanel>

在这里，我们接收到 `message` 的参数为 `"114514"` 字符串，而非数字类型。在经过 `stringify` 处理后，又变成了 `'"114514"'`。所以这里的回复结果最终就变成了 `"114514"`。

Kokkoro 将数据的处理全权交给了用户，至于为什么要这样设计，你可以 [在这里](/about/faq) 找到答案。如果你想要实现参数的类型转换，可以选择使用 `@kokkoro/utils`。

::: code-group

```typescript [Hook] {1,13}
import { stringToNumber } from '@kokkoro/utils';
import { Metadata, useCommand } from '@kokkoro/core';

export const metadata: Metadata = { … };
export default function Example() {
  useCommand('/复读 <message>', ctx => {
    const { message } = ctx.query;
    const is_number = /^\d+/.test(message);

    if (!is_number) {
      return JSON.stringify(message);
    }
    const number = stringToNumber(message);

    return JSON.stringify(number);
  });
}
```

```typescript [Decorator] {1,14}
import { stringToNumber } from '@kokkoro/utils';
import { Command, CommandContext, Plugin } from '@kokkoro/core';

@Plugin({ … })
export default class Example {
  @Command('/复读 <message>')
  replayMessage(ctx: CommandContext) {
    const { message } = ctx.query;
    const is_number = /^\d+/.test(message);

    if (!is_number) {
      return JSON.stringify(message);
    }
    const number = stringToNumber(message);

    return JSON.stringify(number);
  }
}
```

:::

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/复读 114514</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">114514</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/复读 哼哼哼啊啊啊啊啊啊啊</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">"哼哼哼啊啊啊啊啊啊啊"</ChatMessage>
</ChatPanel>

相信这个时候你可能就会问了，明明有更简便的方法可以将 `string` 转换为 `number` 类型，为什么还要单独引入新的工具依赖？

```javascript
import { stringToNumber } from '@kokkoro/utils';

const message = '114514';

console.log(+message);
console.log(Number(message));
console.log(parseFloat(message));
console.log(stringToNumber(message));
```

这四种写法，得到的结果都是等价的，不过这只是在最简单的情况下。

其实 `stringToNumber` 可以用来做更多有意思的事情，让我们继续刚才的对话：

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/复读 世界上卖的最贵的手办是多少钱？</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">"世界上卖的最贵的手办是多少钱？"</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/复读 98e</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">9800000000</ChatMessage>
</ChatPanel>

在 `@kokkoro/utils` 中，有着许多你可能会在开发过程中使用到的函数，并不是专用于类型转换，这能为我们的开发带来便捷性。

## 为 query 标注类型

我们可以通过为 command 传入泛型，来定义 query 的字段。

::: code-group

```typescript [Hook] {5}
import { Metadata, useCommand } from '@kokkoro/core';

export const metadata: Metadata = { … };
export default function Example() {
  useCommand<{ message: string }>('/复读 <message>', ctx => ctx.query.message);
}
```

```typescript [Decorator] {6}
import { Command, CommandContext, Plugin } from '@kokkoro/core';

@Plugin({ … })
export default class Example {
  @Command('/复读 <message>')
  replayMessage(ctx: CommandContext<{ message: string }>) {
    return ctx.query.message;
  }
}
```

:::
