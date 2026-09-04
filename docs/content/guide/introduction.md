# 简介 {#introduction}

## 什么是 Kokkoro？ {#what-is-kokkoro}

Kokkoro 是一个运行在 Bun 上的 QQ 机器人框架。它直接通过 QQ 官方 API 接收私聊和群聊事件，不依赖 OneBot、Satori 等社区协议。

Kokkoro 支持 WebSocket 和 WebHook 两种 QQ 接入方式，也可以在同一个项目中运行多个机器人。机器人的功能由插件扩展，插件通过 Hook API 注册指令并监听事件，不同功能可以分别拆成独立插件。

下面的插件注册了两条指令：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', () => 'pong');
  useCommand('/nya <content>', context => `${context.args.content}喵`);
};
```

实际效果如下：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /ping</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">pong</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /nya 你好</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">你好喵</ChatMessage>
</ChatPanel>

用户发送 `/ping` 后，机器人会回复「pong」。`/nya <content>` 会读取 `/nya` 后的第一个参数，并在末尾加上「喵」。插件入口、Hook API 和指令参数将在后续开发文档中分别介绍。

## Kokkoro 与 Chobits {#kokkoro-and-chobits}

[Chobits](https://github.com/xueelf/chobits) 是 Kokkoro 与 QQ 通信所使用的机器人 SDK，负责建立连接、接收事件和调用 QQ API。Kokkoro 在 Chobits 之上提供项目配置、多机器人管理和插件系统。

如果只需要监听 QQ 事件和调用 QQ API，可以直接使用 Chobits。如果还需要插件系统或多机器人管理，则可以使用 Kokkoro。

## 阅读前提 {#prerequisites}

文档中的代码示例使用 TypeScript，操作步骤会用到终端。继续阅读前，需要了解 JavaScript 基础语法和终端的基本操作。涉及 TypeScript 类型时，文档会在对应位置补充说明。

如果还没有接触过 JavaScript，可以先阅读 MDN 的 [JavaScript 指南](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide)。具备这些基础后，可以按照 [快速上手](/guide/quick-start) 安装 Bun、初始化 Kokkoro 项目，并完成第一次消息交互。

## 名字的由来 {#name-origin}

可可萝（コッコロ）是 Cygames 开发的游戏 [公主连结 Re:Dive](https://game.bilibili.com/pcr/) 中的角色。项目名称取自「コッコロ」的罗马字写法 Kokkoro。

<ThemeImage
  light="/images/priconne/105931.webp"
  dark="/images/priconne/107661.webp"
  alt="コッコロ"
/>

## 问题反馈 {#feedback}

遇到问题或有改进建议时，可以提交 [Issue](https://github.com/kokkorojs/kokkoro/issues)，也可以在 [QQ 群](https://jq.qq.com/?_wv=1027&k=3hcWCnhq) 中反馈。
