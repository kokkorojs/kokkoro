# 指令参数 {#command-arguments}

指令可以在名称后面声明参数。Kokkoro 会按照声明顺序读取消息中的参数值，并将结果保存到 `context.args`。

## 声明参数 {#declare-arguments}

下面的 `/复读` 指令声明了一个名为 `content` 的参数：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/复读 <content>', context => context.args.content);
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 Ciallo～</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">Ciallo～</ChatMessage>
</ChatPanel>

`<content>` 中的尖括号表示这个参数必填。用户发送 `/复读 Ciallo～` 时，`context.args.content` 的值是 `"Ciallo～"`。

Kokkoro 支持四种参数写法：

| 写法                 | 含义         | 对应类型            |
| -------------------- | ------------ | ------------------- |
| **&lt;name&gt;**     | 一个必填值   | string              |
| **[name]**           | 一个可选值   | string \| undefined |
| **&lt;names&gt;...** | 一个或多个值 | string[]            |
| **[names]...**       | 零个或多个值 | string[]            |

尖括号或方括号中的名称会成为 `context.args` 的属性名。

参数名不能为空，也不能包含空白字符、点号、尖括号或方括号。参数名称重复或不符合这些规则时，Kokkoro 会拒绝挂载插件，并在终端中显示有问题的参数名。

指令没有声明参数时，`context.args` 是空对象 `{}`。

## 必填参数 {#required-arguments}

尖括号声明必填参数。用户没有提供必填参数时，Kokkoro 不会执行处理函数，而是回复正确的指令语法：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">缺少指令参数，有效语句为："/复读 &lt;content>"</ChatMessage>
</ChatPanel>

一条指令可以声明多个必填参数。Kokkoro 使用空格分隔参数值，再按照声明顺序将它们保存到 `context.args`：

```typescript
useCommand('/天气 <city> <date>', context => `${context.args.date} ${context.args.city}天气：晴`);
```

发送 `/天气 北京 明天` 时，`city` 的值是 `"北京"`，`date` 的值是 `"明天"`。

## 可选参数 {#optional-arguments}

方括号声明可选参数。用户没有提供该参数时，对应的值是 `undefined`。`??` 会在左侧为 `undefined` 时使用右侧的默认值：

```typescript
useCommand('/问候 [name]', context => {
  const name = context.args.name ?? '朋友';

  return `你好，${name}`;
});
```

发送 `/问候 可可萝` 会回复「你好，可可萝」，只发送 `/问候` 则会回复「你好，朋友」。

必填参数必须写在可选参数之前，否则插件无法挂载。这样可以确保每个值都能对应到明确的参数。

## 多余参数 {#extra-arguments}

Kokkoro 使用空格分隔参数值。不带 `...` 的普通参数每次接收一个值，用户提供的值多于指令声明的参数时，多出的部分会被忽略。

例如，`/复读 <content>` 只声明了一个参数：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 hello world</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">hello</ChatMessage>
</ChatPanel>

命令行中的 POSIX Shell 可以使用引号，将包含空格的内容作为一个参数。部分机器人框架也沿用了这套语法，但 Kokkoro 不会解释引号和转义字符：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 "hello world"</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">"hello</ChatMessage>
</ChatPanel>

带引号的内容仍会被拆成 `"hello` 和 `world"`。POSIX Shell 的引号和转义规则面向命令行工具，使用者会明确输入一条结构化命令。Kokkoro 的指令在聊天窗口中使用，使用者也可能没有编程基础。要求用户为了发送一句普通文本而先理解命令行语法，反而会增加使用成本。需要接收后续全部内容时，可以使用下一节的可变参数。

::: tip
Kokkoro 使用正则表达式 `\s` 匹配指令中的空白字符，因此全角空格和制表符也能分隔参数。但为了便于输入和辨认，建议只使用半角空格。
:::

## 可变参数 {#variadic-arguments}

在参数声明后添加 `...`，可以将后续的参数值保存到数组中：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/复读 <parts>...', context => context.args.parts.join(' '));
};
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /复读 hello world</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">hello world</ChatMessage>
</ChatPanel>

`context.args.parts` 的值是 `['hello', 'world']`。`join(' ')` 使用空格连接数组中的内容，所以机器人会回复完整文本。

必填可变参数 `<parts>...` 至少需要一个值。可选可变参数 `[parts]...` 可以没有值，此时对应的是空数组 `[]`。可变参数会接收余下的所有参数值，因此只能写在参数列表末尾。

## 转换参数类型 {#convert-types}

即使用户输入的是数字，`context.args` 中保存的仍然是字符串。

数字需要先用 `Number()` 转换，再检查转换结果是否符合要求：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/抽卡 <count>', context => {
    const count = Number(context.args.count);

    if (!Number.isInteger(count) || count < 1) {
      throw new Error('抽卡次数必须是正整数');
    }
    return `抽取 ${count} 次`;
  });
};
```

发送 `/抽卡 10` 时，`context.args.count` 的值先是字符串 `"10"`，再由 `Number()` 转换为数字 `10`。转换结果不是整数或小于 `1` 时，处理函数会抛出错误。

Kokkoro 不会为参数增加专用的类型转换语法，原因参阅 [为什么指令参数都是字符串？](/about/faq#command-arguments-as-strings)。

## 类型推导 {#type-inference}

TypeScript 会根据传给 `useCommand()` 的字符串字面量自动推导 `args`。声明 `/天气 <city> [date]` 后，编辑器会知道 `city` 是 `string`，`date` 是 `string | undefined`：

```typescript
useCommand('/天气 <city> [date]', context => {
  const date = context.args.date ?? '今天';

  return `${date}${context.args.city}天气：晴`;
});
```

不需要为 `context.args` 手动声明类型。参数重复、必填参数位于可选参数之后，或可变参数不在末尾时，TypeScript 会标记错误，Kokkoro 也会拒绝挂载该插件。

掌握参数的声明和读取后，可以继续阅读 [指令快捷方式](/develop/command-shortcuts)，为同一个处理函数添加自然语言触发方式。
