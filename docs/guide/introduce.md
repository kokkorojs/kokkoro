# 简介

::: tip 这里是正在施工的 Kokkoro 开发文档
由于个人时间有限，无法保证文档能在第一时间更新，部分内容可能会与框架的实际表现略有差异。
:::

## 什么是 Kokkoro？

Kokkoro 是一个基于 [Amesu](https://github.com/xueelf/amesu) SDK，使用 **TypeScript** 语言开发的 QQ 机器人框架。她能让 QQ 机器人的开发变得简单易上手，仅基于 Node.js 运行环境，不用安装任何第三方软件，API 也十分简洁。

下面是一个**最基础**的插件示例：

```javascript
import { useCommand } from '@kokkoro/core';

/**
 * @type {import('@kokkoro/core').Metadata}
 */
export const metadata = {
  name: 'example',
  description: '插件示例',
};

export default function Example() {
  useCommand('/测试', () => 'hello world');
  useCommand('/复读 <message>', ctx => ctx.query.message);
}
```

结果展示：

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/测试</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">hello world</ChatMessage>
    <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/复读 人的本质</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">人的本质</ChatMessage>
</ChatPanel>

虽然 Kokkoro 的上手十分简单，文档中也会为你介绍 Node.js 的开发过程，但在这之前，你要对 **JavaScript** 有着基础的了解。

如果你对开发完全陌生，那最好不要直接从一个框架开始进行入门学习，不然会遇到许多瓶颈。你可以通过这篇 [JS 教程](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Language_overview) 来上手这门编程语言，在了解完基础语法后，再回到这里。

## 名字的由来

可可萝（コッコロ），是 Cygames 开发和发行的游戏[『公主连结 Re:Dive』](https://game.bilibili.com/pcr/)中的登场角色，其日语的罗马音 **「ko kko ro」** 用作了本项目的名字。

![3★コッコロ](/images/priconne/105931.webp)

最初，项目起名为 [Yumemi](https://github.com/xueelf/yumemi_bot) 并在游戏公会内自用，并没打算开放。因立项时没有考虑过后续维护，导致代码严重耦合，重构后就顺便开源了。一想到我的项目能多少给他人带来便利，这难到不是一件很 cool 的事情么？

## API 风格

在前面，我们为你展示了 JavaScript 的基础代码示例，不过在开发中，我们更推荐使用 TypeScript 来获取更好的开发体验。

如果你选择 TypeScript 作为开发语言，那么除了前面示例中的 **Hook** API，你还可以使用 **Decorator** API 来开发插件。

::: code-group

```typescript [Hook]
import { Metadata, useCommand } from '@kokkoro/core';

export const metadata: Metadata = {
  name: 'example',
  description: '示例插件',
};

export default function Example() {
  useCommand('/测试', () => 'hello world');
  useCommand('/复读 <message>', ctx => ctx.query.message);
}
```

```typescript [Decorator]
import { Command, CommandContext, Plugin } from '@kokkoro/core';

@Plugin({
  name: 'example',
  description: '示例插件',
})
export default class Example {
  @Command('/测试')
  testMessage() {
    return 'hello world';
  }

  @Command('/复读 <message>')
  replayMessage(ctx: CommandContext) {
    return ctx.query.message;
  }
}
```

:::

要是接触过 React 和 Angular，那么这上面的代码会让你感到十分亲切。虽然底层实现并不相同，但 Kokkoro 还是尽量保持了 API 在这两者风格上的统一，来避免提高学习成本。~~为什么没有 Vue？~~

你不用纠结自己到底应该使用哪一种 API 风格，没有最好的，只有最适合自己的。Kokkoro 只是为你提供了更多的选择，你可以根据自己的使用习惯来自由搭配 (\*^▽^\*)。

## 开发初衷

接触过 QQ 机器人的应该都知道，类似的框架其实有非常非常多，那为什么还要去重复造轮子呢？

其实在 19 年我就开始接触 QQ 机器人了，起初是因为想利用 QQ 做一些自动化消息推送。后面因为疫情开始接触『公主连结』，认识了许许多多有趣的人，加上游戏内公会战也需要机器人去查询各类信息，就用 coolq 简单做了一个。

这也是为什么这个项目我使用游戏内角色名的理由，但后来发生的事情大家也都知道，coolq 跑路导致机器人无法正常使用，所以就萌生了开发框架的想法。

不过这其实也不是主要原因，在开坑前就有许多优秀的项目，例如 Mirai、NoneBot、Koishi 等... 但中途的各种阴差阳错，让我最终还是选择了自研。如果你比较感兴趣，也可以去查看这一份无关紧要的 [开发历程](/about/history) 了解下黑历史（笑）。

## 如何使用

如果你没有服务器或者是技术小白，有机器人的使用需求随时都可以 [加群](https://jq.qq.com/?_wv=1027&k=3hcWCnhq) 申请，是免费提供的，未来也没有收费的打算。靠爱发电嘛，给个 star 就行（笑）。

在使用过程中你有任何意见或建议，都可以提 issue 或在群内反馈，有想要添加的新功能都可以来跟我说，比较实用而且需求较大我会**考虑开发**。

本身是出于自用开发的，平时都是用业余时间维护，也没有做过相关宣传与推广。这 4 年时间里都没有第二个人开发，不过 Kokkoro 依然在保持着更新。

至于维护到什么时候嘛，谁知道呢，毕竟这傻女儿是我一手带大的。如果这个项目帮到了你，那就是我最大的荣幸了。
