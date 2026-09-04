# 编写第一个插件 {#first-plugin}

快速上手创建的 `example` 插件已经包含 `/ping` 指令。本页将保留这条指令，并为插件新增一条能够响应「你好」的指令。

## 创建插件 {#create-plugin}

如果已经完成 [快速上手](/guide/quick-start#create-local-plugin) 中的「创建本地插件」，可以直接进入 [新增指令](#add-command)。尚未创建该插件时，在项目根目录运行：

```shell
kokkoro plugin example
```

`kokkoro plugin` 由 Kokkoro CLI 提供。如果终端无法识别 `kokkoro` 命令，先按照 [安装 Kokkoro CLI](/guide/cli#install-cli) 完成安装。

命令会创建 `plugins/example` 文件夹，并生成 `package.json` 和 `src/index.ts`。

创建插件后，在项目根目录再次安装依赖，让 Bun 将新插件链接到当前项目：

```shell
bun install
```

## 新增指令 {#add-command}

打开插件入口文件 `plugins/example/src/index.ts`。文件中的初始代码如下：

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', () => 'pong');
};
```

第一行从 `@kokkoro/core` 导入 `useCommand()`。默认导出的函数是插件入口，类型为 `PluginSetup`。Kokkoro 将插件挂载到 `Bot` 时会执行这个函数。

`useCommand()` 注册了 `/ping` 指令，第二个参数是处理指令的函数。该函数返回「pong」后，Kokkoro 会将这段文本回复到当前会话。

保留 `/ping`，并在下方新增 `/hello` 指令：

```typescript {5}
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', () => 'pong');
  useCommand('/hello', () => 'hello, world').shortcut('你好');
};
```

第二个 `useCommand()` 注册了 `/hello` 指令。末尾的 `shortcut('你好')` 为同一条指令添加了自然语言快捷方式，因此发送 `/hello` 或「你好」都会执行这个处理函数。快捷方式的匹配规则将在 [指令快捷方式](/develop/command-shortcuts) 中详细介绍。

## 验证插件 {#verify-plugin}

Kokkoro 只在启动时加载插件。如果项目仍在运行，先按 **Ctrl+C** 停止进程，再重新启动：

```shell
bun start
```

插件加载完成后，终端会出现类似下面的日志：

```text
[2026-08-26T02:57:35.797Z] INFO kokkoro:plugin - 已加载 kokkoro-plugin-example
[2026-08-26T02:57:35.798Z] INFO kokkoro - 服务已启动 http://localhost:3000/
[2026-08-26T02:57:35.798Z] INFO kokkoro:APP_ID:websocket - 已连接 可可萝
[2026-08-26T02:57:35.798Z] INFO kokkoro - 启动完成 WebSocket 1 WebHook 0
```

终端出现「启动完成」后，向机器人发送「你好」。群聊没有开启「获取群内全部消息」时，需要先 @ 机器人：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 你好</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">hello, world</ChatMessage>
</ChatPanel>

机器人回复「hello, world」，表示新的处理函数已经生效 (●'◡'●)

接下来可以阅读 [事件监听](/develop/event)，了解 QQ 事件以及事件监听与指令处理的关系。
