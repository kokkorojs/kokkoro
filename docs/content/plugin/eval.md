# 代码执行 {#eval}

`kokkoro-plugin-eval` 可以在聊天中执行 JavaScript 或 TypeScript 代码，并将结果回复到当前会话。

::: danger 安全风险
执行的代码拥有与 Kokkoro 进程相同的系统权限，可以读取文件和环境变量，也可以执行系统命令。如果不受信任的用户可以向机器人发送消息，请勿安装该插件。
:::

## 安装 {#installation}

在 Kokkoro 项目目录中安装插件：

```shell
bun add kokkoro-plugin-eval
```

安装完成后，重新启动项目，Kokkoro 会自动加载插件。

## 执行代码 {#execute-code}

将代码写在 `/执行` 后面：

```text
/执行 0.1 + 0.2
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">/执行 0.1 + 0.2</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">0.30000000000000004</ChatMessage>
</ChatPanel>

插件会在新的 Bun 子进程中执行代码。执行的代码可以使用 TypeScript 语法和顶层 `await`。

## 快捷执行 {#shortcut}

在代码前输入 `>`，可以省略 `/执行`：

```text
> ((value: number) => value * 2)(21)
```

只有在群聊中开启「获取群内全部消息」权限后，普通群消息才能触发快捷方式。未开启该权限时，需要在消息中 @ 机器人。

## 环境变量 {#environment-variables}

执行超时时间和输出上限可以通过以下环境变量调整：

```ini
EVAL_TIMEOUT=60000
EVAL_MAX_BUFFER=65536
```

- **EVAL_TIMEOUT**：代码能够执行的最长时间，单位为毫秒，默认值为 `60000`。
- **EVAL_MAX_BUFFER**：标准输出和错误输出的缓冲区上限，单位为字节，默认值为 `65536`。

修改环境变量后，需要重新启动项目。

环境变量的创建和读取方式参阅 [环境变量](/guide/environment-variables)。
