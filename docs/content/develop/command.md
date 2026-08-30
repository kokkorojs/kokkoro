# 指令参数 {#command-arguments}

## 参数语法 {#syntax}

你可以通过命令行语法（command line syntax）为指令添加参数，例如 `<arg>`、`[arg]`、`<arg>...` 和 `[arg]...`。

必选参数必须位于可选参数之前，可变参数必须位于末尾。消息内容使用空白分隔参数，引号只是普通字符，不会按照 Shell 语法合并参数。

```typescript {4}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/复读 <part>', context => context.args.part);
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 ciallo</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">ciallo</ChatMessage>
</ChatPanel>

指令参数会全部存储在 **`context.args`** 中。如果指令没有声明任何参数，那么 `args` 的值是 `{}` 空对象。

## 必填参数 {#required-arguments}

如果指令缺少必填参数，Kokkoro 会回复正确的指令语法。

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">缺少指令参数，有效语句为："/复读 &lt;part>"</ChatMessage>
</ChatPanel>

## 可选参数 {#optional-arguments}

如果你为指令添加了可选参数（`[arg]`），那么当指令未传入参数时，该字段的值是 `undefined`，这点需要注意。

```typescript {4}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/复读 [part]', context => String(context.args.part));
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">undefined</ChatMessage>
</ChatPanel>

## 多余参数 {#extra-arguments}

普通参数只接收一个值，后续没有对应声明的参数会被**忽略**。

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 hello world</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">hello</ChatMessage>
</ChatPanel>

如果需要接收后续的全部参数，可以使用可变参数。

## 可变参数 {#variadic-arguments}

可变参数（`<args>...`、`[args]...`）会将后续的**所有内容**全部追加至数组中，这与 JavaScript 中的 [Rest 语法](https://zh.javascript.info/rest-parameters-spread) 十分相似。

```typescript {4}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/复读 <parts>...', context => context.args.parts.join(' '));
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 hello world</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">hello world</ChatMessage>
</ChatPanel>

`useCommand()` 针对可变参数做了严格的语法校验，与 JavaScript 一样，它们都只能放在**参数的最后面**，不然会导致插件无法被正常挂载。

```typescript {4}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/来点涩图 <tags>...', context => context.args.tags);
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /来点涩图 贫乳 萝莉 白丝</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">["贫乳", "萝莉", "白丝"]</ChatMessage>
</ChatPanel>

::: warning 不可以涩涩
这里只是为了趣味性才举了这么一个例子，你可别真的去做一个涩图插件，连指令都过不了审。~~别问我是怎么知道的~~
:::

值得注意的是，必选可变参数的非空校验依然存在，而可选可变参数在不传入任何内容的时候，其变量的值是 `[]` 空数组，而不是 `undefined`。

## 参数类型 {#argument-types}

在 QQ 中，所有消息都是通过聊天窗口下半部分的输入框发送的，我们可以将其视作为一个 `textarea` 元素。

而 `args` 中的参数字段，又全部都是通过消息文本解析得到的，也就是说，我们解析得到的所有数据**全部都是字符串**。

```typescript {4}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/复读 <part>', context => JSON.stringify(context.args.part));
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 114514</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">"114514"</ChatMessage>
</ChatPanel>

在这里，`part` 参数的值是 `"114514"` 字符串，而不是数字。经过 `stringify` 处理后，它会变成 `'"114514"'`，最终回复为 `"114514"`。

Kokkoro 将数据处理交给开发者，设计原因可以参阅 [为什么指令参数都是字符串？](/about/faq#command-arguments-as-strings)。如果需要转换参数类型，可以直接使用 JavaScript 提供的方法。

```typescript {6-8}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/复读 <part>', context => {
    const { part } = context.args;
    const number = Number(part);

    return Number.isNaN(number) ? JSON.stringify(part) : JSON.stringify(number);
  });
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 114514</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">114514</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 哼哼哼啊啊啊啊啊啊啊</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">"哼哼哼啊啊啊啊啊啊啊"</ChatMessage>
</ChatPanel>

## 异常处理 {#errors}

指令处理函数抛出 `Error` 时，Kokkoro 会将 `error.message` 回复给消息来源，并在日志中记录该错误。处理函数不得抛出字符串、对象或其他非 `Error` 值。

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', () => {
    throw new Error('请求超时');
  });
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /ping</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">请求超时</ChatMessage>
</ChatPanel>

## 类型推导 {#type-inference}

只要为 `useCommand()` 传入字符串字面量，TypeScript 就会根据指令语法自动推导 `args` 的字段与类型，不需要手动标注泛型。

```typescript {4}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/复读 <part>', context => context.args.part);
};
```

## 快捷方式 {#shortcuts}

除了以 `/` 开头的指令，还可以通过 `shortcut()` 匹配自然语言。字符串会匹配完整的消息内容，正则表达式则可以使用命名捕获组获取参数。

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', () => 'pong').shortcut('测试');

  useCommand('/天气 <city>', context => `${context.args.city}天气晴`).shortcut(/^查询(?<city>.+)天气$/);
};
```

两侧的 `/` 表示这是一段**正则表达式**，内部规则可以拆成三部分：

- `^查询` 要求消息以「查询」开头。
- `(?<city>.+)` 将中间的一个或多个字符保存为名为 `city` 的参数。
- `天气$` 要求消息以「天气」结尾。

命名捕获组 `city` 必须与指令参数 `<city>` 同名。收到「查询北京天气」时，`context.args.city` 的值就是 `"北京"`。

更多语法参阅 [MDN 正则表达式指南](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions) 和 [命名捕获组](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions/Groups_and_backreferences#%E4%BD%BF%E7%94%A8%E5%91%BD%E5%90%8D%E7%BB%84)。
