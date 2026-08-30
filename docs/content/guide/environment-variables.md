# 环境变量 {#environment-variables}

Bun 原生支持环境变量解析，会在 Kokkoro 项目启动时自动加载环境变量文件。

环境变量是一组可以在代码中读取的自定义变量。用户可以通过配置这些变量调整或扩展插件行为。

## 环境变量文件 {#files}

项目通常将这些变量保存在工作目录的 `.env` 文件中。该文件与 `kokkoro.json` 位于同一目录：

```text
./
├── .env
├── kokkoro.json
└── main.ts
```

开源社区通常使用全大写的环境变量名，多个单词之间使用下划线分隔。下面以 API KEY 为例：

```ini
API_KEY=1145141919
```

修改 `.env` 文件后，新的值会在下次启动项目时生效。该文件可能包含 API 密钥等敏感信息，因此通常不会提交到 Git。以下 `.gitignore` 规则会忽略所有以 `.env` 开头的文件：

```text
.env*
```

## 读取变量 {#read}

插件读取环境变量时，得到的值始终是**字符串**：

```typescript
export default () => {
  const { API_KEY } = import.meta.env;

  if (!API_KEY) {
    throw new Error('未配置 API_KEY，无法访问服务');
  }
};
```

有些插件还需要使用数字。例如，我们可以写一个骰子插件，通过 `DICE_SIDES` 动态控制骰子的面数：

```ini
DICE_SIDES=6
```

虽然 `.env` 文件中写的是 `6`，代码读取到的仍然是字符串 `"6"`。使用 `Number()` 可以将它转换成数字：

```typescript
import { useCommand } from '@kokkoro/core';

const { DICE_SIDES = '6' } = import.meta.env;
const diceSides = Number(DICE_SIDES);

if (!Number.isInteger(diceSides) || diceSides < 1) {
  throw new Error('DICE_SIDES 必须是正整数');
}

export default () => {
  useCommand('/骰子', () => Math.floor(Math.random() * diceSides) + 1);
};
```

`DICE_SIDES = '6'` 表示没有配置该变量时，默认使用字符串 `"6"`。转换后的 `diceSides` 是数字，指令会返回 `1` 至 `diceSides` 之间的随机整数。将 `DICE_SIDES` 改为 `20` 后，`/骰子` 的结果范围也会变成 `1` 至 `20`。

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /骰子</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">4</ChatMessage>
</ChatPanel>

从 `bun` 导入的 `env`、`Bun.env` 和 `process.env` 也能读取相同的变量：

```typescript
import { env } from 'bun';

env.API_KEY;
Bun.env.API_KEY;
process.env.API_KEY;
import.meta.env.API_KEY;
```

这 4 种写法读取的是同一组数据，不过 `import.meta.env` 不依赖全局对象或额外导入，因此推荐统一使用这种写法。

## 加载规则 {#loading}

Kokkoro 项目通常使用以下两个文件：

| 文件           | 用途                       |
| -------------- | -------------------------- |
| **.env**       | 项目的通用配置             |
| **.env.local** | 只在当前设备生效的本地配置 |

两个文件中出现同名变量时，`.env.local` 中的值生效。

完整的加载规则参阅 [Bun 环境变量文档](https://bun.com/docs/runtime/environment-variables)。
