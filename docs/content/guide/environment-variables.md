# 环境变量 {#environment-variables}

插件可以通过环境变量接收 API 密钥、功能选项等配置，无需将这些值写入源码。启动 Kokkoro 时，Bun 会自动读取项目中的环境变量文件。

## 环境变量文件 {#env-files}

Kokkoro 项目的环境变量通常写在根目录的 `.env` 文件中。这个文件与 `kokkoro.json` 位于同一目录：

```text
./
├── .env
├── kokkoro.json
└── main.ts
```

环境变量名通常使用全大写字母，多个单词之间用下划线分隔。下面的 `.env` 内容声明了一个名为 `API_KEY` 的变量：

```ini
API_KEY=1145141919
```

修改 `.env` 文件后，新的值会在下次启动项目时生效。该文件可能包含 API 密钥等敏感信息，因此通常不会提交到 Git。以下 `.gitignore` 规则会忽略所有以 `.env` 开头的文件：

```text
.env*
```

## 在插件中读取环境变量 {#read-environment-variables}

插件可以通过 `import.meta.env` 读取环境变量。读取已经设置的环境变量时，得到的值都是**字符串**：

```typescript
export default () => {
  const { API_KEY } = import.meta.env;

  if (!API_KEY) {
    throw new Error('未配置 API_KEY，无法访问服务');
  }
};
```

数字配置也可以写入环境变量，但插件读取到的仍然是字符串，需要手动转换类型。下面的骰子插件使用 `DICE_SIDES` 设置骰子的面数：

```ini
DICE_SIDES=6
```

虽然 `.env` 文件中写的是 `6`，插件读取到的仍然是字符串 `"6"`。使用 `Number()` 可以将它转换成数字：

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

`DICE_SIDES = '6'` 表示没有配置该变量时使用默认值 `"6"`。`Number()` 将它转换为数字后，指令会返回 `1` 至 `diceSides` 之间的随机整数。将 `DICE_SIDES` 改为 `20`，结果范围也会变成 `1` 至 `20`。

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /骰子</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">4</ChatMessage>
</ChatPanel>

## 环境变量的加载顺序 {#loading-order}

Bun 会按照下面的顺序读取环境变量文件，越靠后的文件优先级越高：

| 文件                          | 用途                                                 |
| ----------------------------- | ---------------------------------------------------- |
| **.env**                      | 所有环境共用的配置                                   |
| **.env.development** 等       | 与当前 `NODE_ENV` 对应的配置                         |
| **.env.local**                | 不随仓库共享的本地覆盖配置，`NODE_ENV=test` 时不加载 |
| **.env.development.local** 等 | 当前环境中不随仓库共享的本地覆盖配置                 |

例如，`NODE_ENV` 为 `development` 时，Bun 会依次读取 `.env`、`.env.development`、`.env.local` 和 `.env.development.local`。同一个变量在多个文件中出现时，以最后读取的值为准。

完整的加载规则见 [Bun 环境变量文档](https://bun.com/docs/runtime/environment-variables)。
