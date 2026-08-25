# 消息事件

::: tip
本章节将会涉及到变量类型及函数回调，都是一些特别基础的知识。  
在这里不会做基础讲解，如果你至少要对一门编程语言有相关程度的认知，可以继续往下看。
:::

## 上下文 {#context}

在上一章节，我们介绍了如何编写自己的第一个插件，我们使用了 `event`，让 example 插件监听了 `session.ready` 事件。

<ChatPanel>
  <ChatMessage qq="437402067" nickname="友人A">那个那个，ctx 到底是什么呀？</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">哈？你问我干嘛，打出来看看不就知道了嘛！</ChatMessage>
</ChatPanel>

::: code-group

```typescript [Hook] {5}
import { Metadata, useEvent } from '@kokkoro/core';

export const metadata: Metadata = { … };
export default function Example() {
  useEvent(console.log, ['session.ready']);
}
```

```typescript [Decorator] {7}
import { Context, Event, Plugin } from '@kokkoro/core';

@Plugin({ … })
export default class Example {
  @Event('session.ready')
  onReady(ctx: Context<'session.ready'>) {
    console.log(ctx);
  }
}
```

:::

在机器人建立会话通信后，可以在控制台看到如下输出。初次你可能看不懂这里面的大部分字段，但是下面的这些属性，就算我不写注释你应该也知道代表着什么。

```shell
{
  user: {
    id: '1145141919810',
    username: '可可萝',
    bot: true,
    status: 1
  },
  // ...
}
```

没错，你已经猜到了，属性 `ctx` 正是你所发送消息的**事件上下文**，例如我们刚刚触发的**会话事件**，在这个上下文中就有着机器人的 id 及账号昵称的相关字段。

除了基础事件内容，`ctx` 上还有着大量你用得到的属性与方法：

- ctx.bot
- ctx.api
- ctx.request
- ctx.logger

## 事件监听

上面示例中的 `event` 便是监听机器人事件的方法，刚刚编写的 example 插件只监听了 `session.ready` 事件，所以只会在客户端建立会话通信时执行对应逻辑。

而事件有很多很多种，会话事件只是其中之一，其它比较常见的例如**群事件**（群消息）、**频道事件**（子频道消息）都有相关事件名。Kokkoro 是基于 Amesu SDK，事件名与官方保持一致，更多事件可在腾讯 [官方文档](https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/interface-framework/event-emit.html#%E4%BA%8B%E4%BB%B6%E8%AE%A2%E9%98%85Intents) 查看。

在这里，你可以通过事件制作出各种各样有趣的插件，让机器人变得更加强大。o((>ω< ))o

## 代码规范

前面我们有提到，机器人是通过事件驱动的，任何动作都会产生与之相对应的事件，消息也不例外。

比如，你可以这样子去监听频道的消息事件：

::: code-group

```typescript [Hook] {5}
import { Metadata, useEvent } from '@kokkoro/core';

export const metadata: Metadata = { … };
export default function Example() {
  useEvent(console.log, ['at.message.create']);
}
```

```typescript [Decorator] {5}
import { Context, Event, Plugin } from '@kokkoro/core';

@Plugin({ … })
export default class Example {
  @Event('at.message.create')
  onReady(ctx: Context<'at.message.create'>) {
    console.log(ctx);
  }
}
```

:::

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/测试</ChatMessage>
</ChatPanel>

```shell {3}
{
  channel_id: '633481120',
  content: '<@!3958153663914325267> /测试 ',
  guild_id: '8187260533469556672',
  id: '08c0df9ca8bcc2bfcf7110a0cf88ae0238df0548d3cac5ab06',
  member: {
    joined_at: '2022-04-05T11:55:52+08:00',
    nick: 'Yuki',
    roles: [ '4', '15' ]
  },
  // ...
}
```

这样一来，就可以直接获取到机器人收到指令消息的事件详情。

<ChatPanel>
  <ChatMessage qq="437402067" nickname="友人A">yuki yuki，听你这么一说，我完全懂了</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">啊？懂...懂什么哦？</ChatMessage>
  <ChatMessage qq="437402067" nickname="友人A">既然通过事件就能获取到消息内容，那么指令的响应我是不是就可以这样去写？</ChatMessage>
</ChatPanel>

::: code-group

```typescript [Hook] {6-13}
import { Metadata, useEvent } from '@kokkoro/core';

export const metadata: Metadata = { … };
export default function Example() {
  useEvent(
    ctx => {
      const command = ctx.content.replace(/^.+(?=\/)/, '').trimEnd();

      switch (command) {
        case '测试':
          return 'hello world';
      }
    },
    ['at.message.create'],
  );
}
```

```typescript [Decorator] {6-13}
import { Context, Event, Plugin } from '@kokkoro/core';

@Plugin({ … })
export default class Example {
  @Event('at.message.create')
  onReady(ctx: Context<'at.message.create'>) {
    const command = ctx.content.replace(/^.+(?=\/)/, '').trimEnd();

    switch (command) {
      case '测试':
        return 'hello world';
    }
  }
}
```

:::

<ChatPanel>
  <ChatMessage qq="437402067" nickname="友人A" at="可可萝">/测试</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">hello world</ChatMessage>
  <ChatMessage qq="437402067" nickname="友人A">蒋蒋~怎么样，是不是这样就可以解决问题了？</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">哈？！</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">
    <img width="200" src="/images/meme/西内.jpg" />
  </ChatMessage>
</ChatPanel>

::: danger 不要这样做！
我们一定要避免将**指令逻辑**的代码，直接写到 `event` 里！  
为什么说是避免，而不是禁止？ ~~你非要写我也拦不住呀，而且这样确实能达到效果。~~
:::

其次，为了演示方便，在先前的示例代码里，我们使用了 `console.log` 用作打印输出。而在 `ctx` 中，有着专门针对日志的封装方法，所以我们也不要在插件里编写任何除 `ctx.logger` 的消息打印。

::: code-group

```typescript [Hook] {7}
import { Metadata, useEvent } from '@kokkoro/core';

export const metadata: Metadata = { … };
export default function Example() {
  useEvent(
    ctx => {
      ctx.logger.mark('link start');
    },
    ['session.ready'],
  );
}
```

```typescript [Decorator] {7}
import { Context, Event, Plugin } from '@kokkoro/core';

@Plugin({ … })
export default class Example {
  @Event('session.ready')
  onReady(ctx: Context<'session.ready'>) {
    ctx.logger.mark('link start');
  }
}
```

:::

可千万不要觉得这样做很麻烦，养成一个良好的编码习惯，能让我们的开发效率事半功倍。

## 指令处理

虽然刚刚在 `event` 里去手动处理消息匹配，也实现自定义指令的效果，但是会导致插件后续的可维护性极差，不利于维护。

所以，Kokkoro 提供了 `command` 来进行指令处理，这其实与 `event` 去手动监听**消息事件**实现的效果是等价的，但是能让代码更为简洁。

::: code-group

```typescript [Hook] {5}
import { Metadata, useEvent } from '@kokkoro/core';

export const metadata: Metadata = { … };
export default function Example() {
  useCommand('/测试', () => 'hello world');
}
```

```typescript [Decorator] {5}
import { Context, Event, Plugin } from '@kokkoro/core';

@Plugin({ … })
export default class Example {
  @Command('/测试')
  sayHello() {
    return 'hello world';
  }
}
```

:::

`command` 其实就是 `event` 的语法糖，使用 `command` 将会为我们自动监听 `at.message.create` 和 `group.at.message.create` 这两个事件，分别对应群聊与频道，并在此基础上做了指令参数校验。

## event 还是 command？

尽管 `command` 看起来使用的会更加频繁，但是 `event` 也同样重要，分别用于处理不同的业务场景。

例如你想在机器人上下线时做一些 http 请求或是 io 操作，又或者是在群内有新成员加入时发送消息提示， `command` 肯定是实现不了的。
