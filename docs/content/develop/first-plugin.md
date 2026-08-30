# 编写第一个插件 {#first-plugin}

::: tip
当前页面并不会对编程语言做深入讲解，即使你是小白也可以放心观看。  
之前从未接触过 TypeScript 也能放心食用，接下来的开发过程中会为你逐一讲解 \(￣︶￣\*\))
:::

如果你对 npm 并不了解也没关系，在这里只会介绍本地插件的编写。<br>
但是如果你想对 Kokkoro 有一个更深入的了解，还是需要熟悉 Bun 以及 npm 的基本原理。

## 创建插件 {#create}

使用 CLI 创建插件模板后，将会生成以下代码：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', () => 'pong');
};
```

其实在这个时候，你就已经准备好了一个可以直接使用的插件。

## 运行插件 {#run}

相信你这个时候一定有很多疑问，虽然我们前面有讲过，默认导出的函数是插件的入口，但是 `useCommand()` 又是什么？

::: info 不必在意这些细节
当前章节仅提供示例，目的在于让你能自己编写出可以进行简单交互的插件。  
目前你无需关心这段代码是什么意思，后面会逐一介绍，所以不用着急，让我们继续。
:::

现在，启动你的项目，在插件加载完成、机器人建立通信连接后，可以在日志中看到下面的信息：

```shell {1,3}
[2026-08-26T02:57:35.797Z] INFO kokkoro:plugin - 已加载 kokkoro-plugin-example
[2026-08-26T02:57:35.798Z] INFO kokkoro - 服务已启动 http://localhost:3000/
[2026-08-26T02:57:35.798Z] INFO kokkoro:APP_ID:websocket - 已连接 可可萝
[2026-08-26T02:57:35.798Z] INFO kokkoro - 启动完成 WebSocket 1 WebHook 0
```

通过日志，我们还可以查看到已加载的插件信息。

<ChatPanel self="2225151531" :bots="['2854205915', '2854211958']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /ping</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">pong</ChatMessage>
</ChatPanel>

这下我们就实现好了一个插件的完整交互，是不是非常简单？ (●'◡'●)

## 插件权限

::: warning
Kokkoro v3 的插件权限正在重构，以下内容为 v2 时期的功能。
:::

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

<ChatPanel self="2225151531" :bots="['2854205915', '2854211958']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /一言</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">『只有分离后才能懂的事，却没有了感慨的时间。』——「宝石之国」</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">@爱梅斯 /一言</ChatMessage>
  <ChatMessage qq="2854211958" nickname="爱梅斯">『只要努力活下去，总有一天会笑着回忆。』——「不可思议游戏」</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /疯狂星期四</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">Steam上多买了一个艾尔登法环的key，送给有缘人了:KFCC-RAZY-THUR-SDAY-VME50</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">@爱梅斯 /疯狂星期四</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">在这里，爱梅斯不会对 kfc 插件指令作出响应</ChatMessage>
</ChatPanel>
