# 简介

::: tip 这里是正在施工的 Kokkoro 开发文档
由于个人时间有限，文档可能无法及时更新，部分内容暂时与框架的实际表现不一致。
:::

## 什么是 Kokkoro？

Kokkoro 是一个基于 [Chobits](https://github.com/xueelf/chobits) SDK，使用 **TypeScript** 语言开发的 QQ 机器人框架。她能让 QQ 机器人的开发变得简单易上手，仅基于 Bun 运行时，API 也十分简洁。

下面是一个**最基础**的插件示例：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', () => 'pong');
  useCommand('/nya <content>', context => `${context.args.content}喵`);
};
```

结果展示：

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/ping</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">pong</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/nya 你好</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">你好喵</ChatMessage>
</ChatPanel>

虽然 Kokkoro 的上手十分简单，文档中也会为你介绍使用 Bun 的开发流程，但在这之前，你要对 **JavaScript** 有着基础的了解。

如果你对 JavaScript 完全陌生，那最好不要直接从一个框架开始进行入门学习，不然会遇到许多瓶颈。你可以通过这篇 [JavaScript 指南](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide) 来上手这门编程语言，了解完基础语法后，再回到这里。

准备好后，可以前往 [快速上手](/guide/quick-start) 创建第一个 Kokkoro 项目。

## 名字的由来

可可萝（コッコロ）是 Cygames 开发和发行的游戏 [公主连结 Re:Dive](https://game.bilibili.com/pcr/) 中的登场角色，其日语的罗马音 **ko kko ro** 用作了本项目的名字。

![3★コッコロ](/images/priconne/105931.webp)

## 问题反馈

在使用过程中，如果你有任何意见或建议，都可以提交 [Issue](https://github.com/kokkorojs/kokkoro/issues) 或在 [QQ 群](https://jq.qq.com/?_wv=1027&k=3hcWCnhq) 反馈。
