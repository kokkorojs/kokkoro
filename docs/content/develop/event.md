# 事件监听 {#events}

::: tip
本章节将会涉及到变量类型及函数回调，都是一些特别基础的知识。  
在这里不会做基础讲解，如果你至少对一门编程语言有基础了解，就可以继续往下看。
:::

## 事件上下文 {#context}

在上一章节，我们介绍了如何编写自己的第一个插件，我们使用了 `useCommand()`，让 `example` 插件响应了 `/ping` 指令。

除了指令以外，Kokkoro 还可以通过 `useEvent()` 监听 QQ 事件。现在，我们先来监听机器人连接成功时收到的 `READY` 事件。

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="437402067" nickname="友人A">那个那个，context 到底是什么呀？</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">哈？你问我干嘛，打出来看看不就知道了嘛！</ChatMessage>
</ChatPanel>

```typescript {4}
import { useEvent } from '@kokkoro/core';

export default () => {
  useEvent(console.log, ['READY']);
};
```

在机器人建立会话通信后，可以在控制台看到如下输出。初次你可能看不懂这里面的大部分字段，但是下面的这些属性，就算我不写注释你应该也知道代表着什么。

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

没错，你已经猜到了，回调函数的 `context` 参数正是机器人收到事件时的**事件上下文**。例如刚刚触发的 `READY` 事件，上下文中就包含机器人的 ID 和账号昵称等字段。

事件上下文包含当前 QQ 事件的数据。部分事件还允许机器人直接回复，例如收到消息、用户添加机器人好友或机器人加入群聊。处理这些事件时，可以调用 `context.reply()` 向对应的用户或群聊发送回复。如果需要调用其他 `Bot` 方法，可以从插件默认导出函数的参数获取当前 `Bot`：

```typescript
import { type Bot, useEvent } from '@kokkoro/core';

export default (bot: Bot) => {
  useEvent(
    async context => {
      await bot.sendGroupMessage(context.group_openid, {
        msg_type: 0,
        content: '收到',
        msg_id: context.id,
      });
    },
    ['GROUP_MESSAGE_CREATE'],
  );
};
```

## QQ 事件 {#qq-events}

上面示例中的 `useEvent()` 便是监听机器人事件的方法。刚刚编写的 `example` 插件只监听了 `READY` 事件，所以只会在机器人连接成功时执行对应逻辑。

Kokkoro 将 QQ 推送的原生事件称为 **QQ Dispatch 事件**，其中不包含 QQ 频道事件。原因参阅 [为什么不兼容 QQ 频道？](/about/faq#qq-channel-support)。

`useEvent()` 支持以下 QQ Dispatch 事件：

| 事件名                       | 触发场景                                           |
| ---------------------------- | -------------------------------------------------- |
| **C2C_MESSAGE_CREATE**       | 用户向机器人发送私聊消息                           |
| **FRIEND_ADD**               | 用户添加机器人                                     |
| **FRIEND_DEL**               | 用户删除机器人                                     |
| **C2C_MSG_RECEIVE**          | 用户开启私聊主动消息                               |
| **C2C_MSG_REJECT**           | 用户关闭私聊主动消息                               |
| **GROUP_AT_MESSAGE_CREATE**  | 用户在群内 @ 机器人                                |
| **GROUP_MESSAGE_CREATE**     | 群聊开启「获取群内全部消息」后，用户在群内发送消息 |
| **GROUP_ADD_ROBOT**          | 机器人被添加到群                                   |
| **GROUP_DEL_ROBOT**          | 机器人被移出群                                     |
| **GROUP_MSG_RECEIVE**        | 群消息接收设置被开启                               |
| **GROUP_MSG_REJECT**         | 群消息接收设置被关闭                               |
| **GROUP_MEMBER_ADD**         | 群成员加入群                                       |
| **GROUP_MEMBER_REMOVE**      | 群成员离开群                                       |
| **SUBSCRIBE_MESSAGE_STATUS** | 订阅消息授权状态发生变更                           |
| **GROUP_JOIN_REQUEST**       | 用户申请加入群                                     |
| **INTERACTION_CREATE**       | 用户点击消息按钮、变更授权或进入群机器人管理       |
| **READY**                    | WebSocket 会话准备完成                             |
| **RESUMED**                  | WebSocket 会话恢复完成                             |

在这里，你可以通过事件制作出各种各样有趣的插件，让机器人变得更加强大。o((>ω< ))o

## 事件依赖 {#event-dependencies}

`useEvent()` 的第二个参数是事件依赖数组，用于指定需要监听的 QQ Dispatch 事件。

```typescript
import { useEvent } from '@kokkoro/core';

export default () => {
  useEvent(context => {
    // 每次收到 QQ Dispatch 事件时执行
    console.log(context);
  });

  useEvent(() => {
    // 插件挂载时执行一次
  }, []);

  useEvent(console.log, ['READY', 'RESUMED']);
};
```

不传入第二个参数时，回调函数会处理全部 QQ Dispatch 事件。传入空数组时，回调函数只在插件挂载时执行一次。传入事件数组时，回调函数只处理数组中的事件，`context` 也会根据事件类型自动推导。

## 区分事件与指令 {#events-and-commands}

前面我们有提到，机器人是通过事件驱动的，任何动作都会产生与之相对应的事件，消息也不例外。

比如，你可以这样子去监听群聊中的 @ 消息事件：

```typescript {4}
import { useEvent } from '@kokkoro/core';

export default () => {
  useEvent(console.log, ['GROUP_AT_MESSAGE_CREATE']);
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /测试</ChatMessage>
</ChatPanel>

```javascript {7}
{
  author: {
    id: 'member-openid',
    member_openid: 'member-openid',
    username: 'Yuki'
  },
  content: ' /测试',
  group_openid: 'group-openid',
  id: 'group-message-id',
  timestamp: '2026-08-26T02:57:35.798Z'
}
```

这样一来，就可以直接获取到机器人收到指令消息的事件详情。

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="437402067" nickname="友人A">Yuki Yuki，听你这么一说，我完全懂了</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">啊？懂...懂什么哦？</ChatMessage>
  <ChatMessage qq="437402067" nickname="友人A">既然通过事件就能获取到消息内容，那么指令的响应我是不是就可以这样去写？</ChatMessage>
</ChatPanel>

```typescript {5-12}
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
  <ChatMessage qq="437402067" nickname="友人A">将将～怎么样，是不是这样就可以解决问题了？</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">哈？！</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">
    <img width="200" src="/images/meme/西内.jpg" />
  </ChatMessage>
</ChatPanel>

::: danger 不要这样做！
我们一定要避免将**指令逻辑**的代码，直接写到 `useEvent()` 里！<br>
为什么说是避免，而不是禁止？ ~~你非要写我也拦不住呀，而且这样确实能达到效果。~~
:::

可千万不要觉得这样做很麻烦，养成一个良好的编码习惯，能让我们的开发效率事半功倍。

## 使用 `useCommand()` {#use-command}

虽然刚刚在 `useEvent()` 里去手动处理消息匹配，也实现自定义指令的效果，但是会导致插件后续的可维护性极差，不利于维护。

所以，Kokkoro 提供了 `useCommand()` 来进行指令处理，这其实与 `useEvent()` 去手动监听**消息事件**实现的效果是等价的，但是能让代码更为简洁。

Kokkoro 的机器人指令必须以 `/` 开头，用户直接发送 `/ping` 就能触发匹配。如果希望 QQ 客户端在输入 `/` 时显示指令面板，还需要提前在 [QQ 开放平台](https://q.qq.com) 配置对应指令。

```typescript {4}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', () => 'pong');
};
```

`useCommand()` 会自动处理 `C2C_MESSAGE_CREATE`、`GROUP_AT_MESSAGE_CREATE` 和 `GROUP_MESSAGE_CREATE` 三个消息事件，并在此基础上完成指令匹配、参数校验与消息回复。

回调函数返回 `undefined` 时不会回复消息。返回含有 `msg_type` 字段，并符合 QQ 官方的 [单聊消息](https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_users_user_openid_messages.post.html) 或 [群聊消息](https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_messages.post.html) 结构的对象时，Kokkoro 会直接调用 `context.reply()`。返回其他对象或数组时，会通过 `JSON.stringify()` 转为文本。其余返回值则通过 `String()` 转为文本。

下面的三个指令分别返回数组、普通对象和 QQ 消息对象：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/小小甜心', () => {
    return ['镜华', '美美', '未奏希'];
  });

  useCommand('/状态', () => {
    return {
      name: '可可萝',
      protocol: 'websocket',
    };
  });

  useCommand('/ping', () => {
    return {
      msg_type: 0,
      content: 'pong',
    };
  });
};
```

数组和普通对象会转换成 JSON 文本。QQ 消息对象则会按照 `msg_type` 指定的消息类型发送：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /小小甜心</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">["镜华","美美","未奏希"]</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /状态</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">{"name":"可可萝","protocol":"websocket"}</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /ping</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">pong</ChatMessage>
</ChatPanel>

## `useEvent()` 还是 `useCommand()`？ {#choose-hook}

尽管 `useCommand()` 看起来使用的会更加频繁，但是 `useEvent()` 也同样重要，分别用于处理不同的业务场景。

例如你想在机器人连接成功时发送 HTTP 请求，或者在群内有新成员加入时发送消息提示，`useCommand()` 肯定是实现不了的。

## 自定义事件 {#custom-events}

`useEvent()` 只负责 QQ Dispatch 事件。如果插件需要在自己的代码中传递**自定义事件**，可以先声明事件名和回调参数，再将事件类型写入 `Bot<Events>`。

```typescript
import { type Bot, useCommand } from '@kokkoro/core';

type Events = {
  notice: [content: string];
};

export default (bot: Bot<Events>) => {
  const handleNotice = (content: string) => {
    console.log(content);
  };

  bot.on('notice', handleNotice);

  useCommand('/通知 <content>', async context => {
    await bot.emit('notice', context.args.content);

    return '通知已发送';
  });

  return () => {
    bot.off('notice', handleNotice);
  };
};
```

`Events` 中的属性名表示事件名称，元组表示监听器接收的完整参数列表。上面的 `notice` 事件只有一个 `string` 参数，因此 `bot.emit()` 和 `bot.on()` 都能得到对应的类型提示。

通过 `bot.on()` 注册的监听器不属于 Hook，需要在插件取消挂载时移除。相关规则请参阅 [副作用清理](/develop/side-effects)。
