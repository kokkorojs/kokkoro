# 事件监听 {#events}

QQ 会在机器人连接成功、收到消息或群成员发生变化时推送相应的事件。插件通过 `useEvent()` 监听这些事件，并在事件到达时执行处理函数。

## 监听事件 {#listen-to-events}

下面的插件监听 `READY` 事件。机器人与 QQ 建立 WebSocket 会话后会收到该事件，Kokkoro 随后执行处理函数：

```typescript
import { useEvent } from '@kokkoro/core';

export default () => {
  useEvent(
    context => {
      console.log(context);
    },
    ['READY'],
  );
};
```

`useEvent()` 的第一个参数是收到事件后执行的处理函数。列表中的 `READY` 表示这段代码只处理该事件。

机器人连接成功后，终端会输出类似下面的数据：

```javascript
{
  version: 1,
  session_id: 'session-id',
  user: {
    id: '1145141919810',
    username: '可可萝',
    bot: true,
    status: 1
  },
  shard: [0, 1]
}
```

## 事件上下文 {#event-context}

处理函数接收的 `context` 是事件上下文，其中保存了当前 QQ 事件的数据。上面的代码只监听 `READY`，因此 TypeScript 可以推导出机器人信息、会话 ID 等字段。

监听的事件不同，`context` 的类型也会变化。例如，`GROUP_MEMBER_ADD` 表示有成员加入群聊，对应的上下文包含群聊和成员的标识。

部分事件支持直接回复，这些事件的 `context` 会提供 `reply()`。下面的插件监听 `FRIEND_ADD`，并向刚刚添加机器人的用户发送欢迎消息：

```typescript
import { useEvent } from '@kokkoro/core';

export default () => {
  useEvent(
    async context => {
      await context.reply('很高兴认识你');
    },
    ['FRIEND_ADD'],
  );
};
```

其他事件的 `context` 不会提供 `reply()`，调用时 TypeScript 会提示错误。

## 调用 QQ API {#qq-api}

`context.reply()` 用于回复当前事件。需要查询机器人信息或调用其他 QQ API 时，可以使用传给插件入口函数的 `bot` 参数。

下面的插件在 `READY` 事件发生后查询机器人信息：

```typescript
import { type Bot, useEvent } from '@kokkoro/core';

export default (bot: Bot) => {
  useEvent(async () => {
    const info = await bot.getBotInfo();

    console.log(info);
  }, ['READY']);
};
```

`type Bot` 只导入 TypeScript 类型，不会产生运行时代码。`Bot` 继承 Chobits 的 `Client`，因此可以直接调用 QQ OpenAPI。Core 还提供 `sendUserImage()` 和 `sendGroupImage()`，用于通过图片 URL 向指定用户或群聊发送图片。

## 事件依赖 {#event-dependencies}

`useEvent()` 的第二个参数是事件依赖列表，用来限定处理函数响应哪些事件。传入一个或多个事件名后，只有这些事件会执行处理函数：

```typescript
useEvent(
  context => {
    console.log(context);
  },
  ['READY', 'RESUMED'],
);
```

省略第二个参数时，处理函数会接收所有受支持的 QQ Dispatch 事件：

```typescript
useEvent(context => {
  console.log(context);
});
```

传入空数组时，处理函数不再监听 QQ 事件，而是在插件挂载过程中执行一次：

```typescript
useEvent(() => {
  console.log('插件已挂载');
}, []);
```

这种写法通常用于插件挂载时需要等待的异步初始化，具体执行顺序见 [插件生命周期](/develop/lifecycle#mount-lifecycle)。

## 事件处理函数 {#event-handlers}

事件处理函数不能通过返回值回复消息。需要发送消息时，调用 `context.reply()` 或 `Bot` 上的消息 API。处理函数返回其他值时，Kokkoro 会将其视为错误，并在终端中记录 `TypeError`。

同一个事件同时被多个 `useEvent()` 监听时，Kokkoro 会并发执行这些处理函数，并等待它们全部结束。这些处理函数无法通过注册顺序安排前后步骤。有先后关系的操作应当写在同一个处理函数中，并通过 `await` 明确执行顺序。

插件内部需要传递自己的事件时，可以使用 `bot.on()` 和 `bot.emit()`。自定义事件涉及类型声明和手动清理，进阶用法见 [自定义事件](/develop/custom-events)。

## 支持的事件 {#supported-events}

QQ 通过 Dispatch 推送事件，Kokkoro 支持下面的事件类型：

| 事件名                       | 触发场景                                          |
| ---------------------------- | ------------------------------------------------- |
| **C2C_MESSAGE_CREATE**       | 用户向机器人发送私聊消息                          |
| **FRIEND_ADD**               | 用户添加机器人                                    |
| **FRIEND_DEL**               | 用户删除机器人                                    |
| **C2C_MSG_RECEIVE**          | 用户开启私聊主动消息                              |
| **C2C_MSG_REJECT**           | 用户关闭私聊主动消息                              |
| **GROUP_AT_MESSAGE_CREATE**  | 未开启「获取群内全部消息」时，用户在群内 @ 机器人 |
| **GROUP_MESSAGE_CREATE**     | 开启「获取群内全部消息」后，收到群内的每一条消息  |
| **GROUP_ADD_ROBOT**          | 机器人被添加到群                                  |
| **GROUP_DEL_ROBOT**          | 机器人被移出群                                    |
| **GROUP_MSG_RECEIVE**        | 群消息接收设置被开启                              |
| **GROUP_MSG_REJECT**         | 群消息接收设置被关闭                              |
| **GROUP_MEMBER_ADD**         | 群成员加入群                                      |
| **GROUP_MEMBER_REMOVE**      | 群成员离开或被移出群                              |
| **SUBSCRIBE_MESSAGE_STATUS** | 订阅消息授权状态发生变更                          |
| **GROUP_JOIN_REQUEST**       | 用户申请加入群，机器人需要是群管理员              |
| **INTERACTION_CREATE**       | 用户点击消息按钮、变更授权或进入群机器人管理      |
| **READY**                    | WebSocket 会话准备完成                            |
| **RESUMED**                  | WebSocket 会话恢复完成                            |

表格中的触发场景来自 QQ 官方文档。当前实际测试中，切换私聊主动消息权限时收到的是 `INTERACTION_CREATE`，没有收到 `C2C_MSG_RECEIVE` 或 `C2C_MSG_REJECT`。`GROUP_JOIN_REQUEST` 和 `SUBSCRIBE_MESSAGE_STATUS` 目前也没有取得真实事件数据。Kokkoro 仍然保留这些官方事件的类型，以便 QQ 推送时直接监听。

QQ Dispatch 的通用结构和事件分类见官方 [通用数据结构](https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/event-emit/payload.html)。Kokkoro 不支持 QQ 频道事件，具体原因见 [为什么不兼容 QQ 频道？](/about/faq#qq-channel-support)。

## 事件与指令 {#events-and-commands}

用户发送消息时，QQ 也会向机器人推送事件。监听 `GROUP_AT_MESSAGE_CREATE`，就能从 `context.content` 读取群聊中 @ 机器人的消息。

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="437402067" nickname="友人A">Yuki Yuki，听你这么一说，我完全懂了！</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">啊？懂……懂什么了？</ChatMessage>
  <ChatMessage qq="437402067" nickname="友人A">既然事件里能读取消息内容，那我是不是可以直接这样写指令？</ChatMessage>
</ChatPanel>

```typescript
import { useEvent } from '@kokkoro/core';

export default () => {
  useEvent(
    async context => {
      const command = context.content.trimStart();

      switch (command) {
        case '/ping':
          await context.reply('pong');
      }
    },
    ['GROUP_AT_MESSAGE_CREATE'],
  );
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="437402067" nickname="友人A">@可可萝 /ping</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">pong</ChatMessage>
  <ChatMessage qq="437402067" nickname="友人A">将将～你看，完全可以正常回复嘛！</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">哈？！</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">
    <img width="200" src="/images/meme/西内.jpg" />
  </ChatMessage>
</ChatPanel>

::: danger 不要这样实现指令
这段代码确实能够回复 `/ping`，~~你非要这样写，框架也拦不住。~~

问题在于，它只处理了群聊 @ 消息。要让同一条指令支持私聊和群聊全量消息，还要继续监听另外两种消息事件。代码还要分别处理 @ 机器人、消息开头的空白、指令参数和异常。

如果每条指令都把这些步骤重新实现一遍，消息事件很快就会堆满重复的判断分支。代码虽然暂时能够运行，后续添加指令时却很容易出现三种消息场景行为不一致的问题。
:::

`useCommand()` 正是对这些消息事件和处理步骤的封装，具体写法见 [指令处理](/develop/command)。
