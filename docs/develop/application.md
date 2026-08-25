# 简单示例

::: tip
当前页面并不会对编程语言做深入讲解，即使你是小白也可以放心观看。  
之前从未接触过 JavaScript 也能放心食用，接下来的开发过程中会为你逐一讲解 \(￣︶￣\*\))
:::

如果你对 npmjs 并不了解也没关系，在这里只会介绍本地插件的编写。  
但是如果你想对 Kokkoro 有一个更深入的了解，还是需要熟悉 node 以及 npmjs 的基本原理。

## 编写插件

在我们使用 cli 创建插件模板后，将会为你生成以下的代码：

::: code-group

```javascript [javascript]
import { useCommand, useEvent } from '@kokkoro/core';

/**
 * @type {import('@kokkoro/core').Metadata}
 */
export const metadata = {
  name: 'example',
  description: '插件示例',
};

export default function Example() {
  useEvent(
    ctx => {
      ctx.logger.mark('link start');
    },
    ['session.ready'],
  );

  useCommand('/测试', () => 'hello world');
  useCommand('/复读 <message>', ctx => ctx.query.message);
}
```

```typescript [typescript (Hook)]
import { Metadata, useCommand, useEvent } from '@kokkoro/core';

export const metadata: Metadata = {
  name: 'example',
  description: '示例插件',
};

export default function Example() {
  useEvent(
    ctx => {
      ctx.logger.mark('link start');
    },
    ['session.ready'],
  );

  useCommand('/测试', () => 'hello world');
  useCommand<{ message: string }>('/复读 <message>', ctx => ctx.query.message);
}
```

```typescript [typescript (Decorator)]
import { Command, CommandContext, Context, Event, Plugin } from '@kokkoro/core';

@Plugin({
  name: 'example',
  description: '示例插件',
})
export default class Example {
  @Event('session.ready')
  onReady(ctx: Context<'session.ready'>) {
    ctx.logger.mark('link start');
  }

  @Command('/测试')
  sayHello() {
    return 'hello world';
  }

  @Command('/复读 <message>')
  replayMessage(ctx: CommandContext<{ message: string }>) {
    return ctx.query.message;
  }
}
```

:::

其实在这个时候，你就已经准备好了一个插件，可以直接进行使用。

## 进行交互

相信你这个时候一定有很多疑问，虽然我们前面有讲过，`metadata` 是用来作为插件的唯一标识，但是 `event` 与 `command` 又是什么？

::: info 不必在意这些细节
当前章节仅提供示例，目的在于让你能自己编写出可以进行简单交互的插件。  
目前你无需关心这段代码是什么意思，后面会逐一介绍，所以不用着急，让我们继续。
:::

现在，启动你的项目，在机器人首次建立通信连接后，该插件会在日志里输出 "link start" 的信息，并且还会对指令消息进行响应。

```shell {5,8}
[2024-01-20T19:46:16.519] [INFO] [kokkoro] - ----------
[2024-01-20T19:46:16.521] [INFO] [kokkoro] - Package Version: kokkoro@2.0.5
[2024-01-20T19:46:16.521] [INFO] [kokkoro] - View Documents: https://kokkoro.js.org
[2024-01-20T19:46:16.522] [INFO] [kokkoro] - ----------
[2024-01-20T19:46:16.532] [INFO] [kokkoro] - Mount plugin: "example"
[2024-01-20T19:46:16.623] [MARK] [102071660] - Client is initializing...
[2024-01-20T19:46:17.537] [MARK] [102071660] - Hello, 可可萝
[2024-01-20T19:46:17.541] [MARK] [102071660] - link start
```

通过日志，我们还可以查看到已挂载的插件信息。

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/测试</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">hello world</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/复读 人的本质</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">人的本质</ChatMessage>
</ChatPanel>

这下我们就实现好了一个插件的完整交互，是不是非常简单？ (●'◡'●)

## 插件权限

我们在快速开始一栏中有提到，项目内的所有插件，都是在项目启动时（机器人建立会话通信前）自动挂载的。

但是假如现在有一个需求，我们想要在项目内运行多个机器人，但是只需要特定的对象去使用对应的指令，应该如何实现自定义？

打开 `kokkoro.json` 配置文件，你可以在 `bots` 一栏中添加 `plugins` 属性：

```json {7}
{
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

`plugins` 传入的是一个字符串数组，数组值正是插件的 `metadata.name` 属性，当 `plugins` 没传入任何参数的时候，该机器人就会响应全部插件。

例如我们现在安装了 hitokoto 和 kfc 这两个插件，如果机器人**可可萝**想要使用 kfc 插件，机器人**爱梅斯**却不需要这个插件时，就可以这样去修改：

```json {5,9}
{
  "bots": [
    // 可可萝
    {
      "plugins": ["hitokoto", "kfc"]
    },
    // 爱梅斯
    {
      "plugins": ["hitokoto"]
    }
  ]
}
```

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/来点骚话</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">『只有分离后才能懂的事，却没有了感慨的时间。』——「宝石之国」</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki" at="爱梅斯">/来点骚话</ChatMessage>
  <ChatMessage qq="2854211958" nickname="爱梅斯">『只要努力活下去，总有一天会笑着回忆。』——「不可思议游戏」</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/疯狂星期四</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">Steam上多买了一个艾尔登法环的key，送给有缘人了:KFCC-RAZY-THUR-SDAY-VME50</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki" at="爱梅斯">/疯狂星期四</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">在这里，爱梅斯不会对 kfc 插件指令作出响应</ChatMessage>
</ChatPanel>
