# 一言 {#hitokoto}

`kokkoro-plugin-hitokoto` 从 [Hitokoto 一言](https://hitokoto.cn/) 随机获取一条语句，也可以按动画、文学、诗词等类型筛选。

## 安装 {#installation}

在 Kokkoro 项目目录中安装插件：

```shell
bun add kokkoro-plugin-hitokoto
```

重新启动项目后，Kokkoro 会自动加载插件。

## 随机一言 {#random-sentence}

发送 `/一言`，插件会随机返回一条语句：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">/一言</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">『不对失误耿耿于怀，而是专心为今后做打算，这才是最有效率的。』——「间谍过家家」</ChatMessage>
</ChatPanel>

## 指定语句类型 {#sentence-types}

`/一言` 后面可以填写一个或多个语句类型，多个类型之间使用空格分隔：

```text
/一言 诗词 文学
```

支持的类型包括动画、漫画、游戏、文学、原创、来自网络、其他、影视、诗词、网易云、哲学和抖机灵。

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">/一言 诗词 文学</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">『人生天地间，忽如远行客。』——「古诗十九首」</ChatMessage>
</ChatPanel>

## 快捷方式 {#shortcuts}

在快捷方式的「来点」和「骚话」之间加入一种语句类型，即可指定返回内容的类型：

```text
来点骚话
来点诗词骚话
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">来点骚话</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">『能哭的地方，只有厕所和爸爸的怀里。』——「CLANNAD」</ChatMessage>
</ChatPanel>

只有在群聊中开启「获取群内全部消息」权限后，普通群消息才能触发快捷方式。未开启该权限时，需要在消息中 @ 机器人。

## 在其他插件中获取一言 {#fetch-sentence}

插件同时导出 `fetchSentence()`，其他插件可以通过它取得一言接口返回的完整数据：

```typescript
import { useCommand } from '@kokkoro/core';
import { fetchSentence } from 'kokkoro-plugin-hitokoto';

export default () => {
  useCommand('/诗词', async () => {
    const { from, hitokoto } = await fetchSentence('i');

    return `『${hitokoto}』——「${from}」`;
  });
};
```

`fetchSentence()` 接受单个类型代码或类型代码数组。`'i'` 表示诗词，`['a', 'b']` 表示动画和漫画。传入空数组时不限制类型。类型代码参阅 [一言接口文档](https://developer.hitokoto.cn/sentence/#请求参数)。

### 默认类型 {#default-sentence-types}

调用 `fetchSentence()` 时省略参数，函数会读取 `HITOKOTO_TYPES` 环境变量。多个类型代码使用逗号分隔，未设置时不限制类型：

```ini
HITOKOTO_TYPES=a,b,c
```

环境变量的创建和读取方式参阅 [环境变量](/guide/environment-variables)。
