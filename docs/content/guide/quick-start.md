# 快速上手 {#quick-start}

## 准备工作 {#prerequisites}

在运行 Kokkoro 前，需要做好以下准备：

- **Bun 运行时**：Kokkoro 只支持 Bun 运行时。如果开发环境中尚未安装 Bun，可以按照 [Bun 安装文档](https://bun.com/docs/installation) 中适用于当前操作系统的步骤完成安装。
- **QQ 机器人**：需要提前在 [QQ 开放平台](https://q.qq.com) 创建，并从管理后台获取机器人的 AppID 和 ClientSecret。初始化项目时会用到这两项凭证。

安装 Bun 后，在终端运行以下命令：

```shell
bun --version
```

终端显示 Bun 的版本号，说明 Bun 已经可以正常运行。

## 初始化项目 {#initialize-project}

Kokkoro 提供两种初始化项目的方式。`bun create kokkoro` 会创建一个新的文件夹作为项目目录，并将项目文件写入其中。`kokkoro init` 则会将项目文件写入当前目录。

`kokkoro init` 由 Kokkoro 命令行工具（CLI）提供，后文创建本地插件也会用到这个工具。全局安装后，可以在任意目录运行 `kokkoro`：

```shell
bun add --global @kokkoro/cli
```

安装完成后，运行以下命令检查 CLI 是否可用：

```shell
kokkoro --version
```

终端显示 Kokkoro CLI 的版本号，说明安装成功。

### 创建新项目 {#create-project}

在终端中进入准备存放新项目的上级目录，再运行：

```shell
bun create kokkoro
```

命令会先询问项目名称。直接按回车键会使用默认名称 `kokkoro-app`，配置向导完成后会创建同名文件夹，并将项目文件写入其中。

### 初始化当前目录 {#initialize-current-directory}

如果已经准备好一个空目录，并且要将它作为项目目录，可以进入该目录后运行：

```shell
kokkoro init
```

### 完成配置向导 {#configuration-wizard}

无论使用哪种初始化方式，都会进入相同的配置向导。本页以无需公网地址的本地开发为例，使用以下配置：

1. **服务端口**：保留默认值 `3000`。
2. **QQ 服务接入方式**：选择 **WebSocket**。WebHook 需要可以从公网访问的 HTTPS 回调地址，而 WebSocket 可以直接从本地连接 QQ。
3. **是否添加机器人**：选择 **是**。
4. **机器人 AppID** 和 **机器人 ClientSecret**：填写从 QQ 开放平台获取的凭证。

::: warning
ClientSecret 是敏感凭证。不要向他人公开，也不要将包含真实 ClientSecret 的 `kokkoro.json` 提交到公开仓库。
:::

向导完成后，项目目录中会生成以下内容：

| 路径             | 用途                             |
| ---------------- | -------------------------------- |
| **plugins/**     | 保存项目中的本地插件             |
| **kokkoro.json** | 配置机器人和 Kokkoro 服务        |
| **main.ts**      | 加载配置并启动 Kokkoro           |
| **package.json** | 声明启动脚本、依赖和本地插件目录 |

服务端口、接入方式和机器人凭证都保存在 `kokkoro.json` 中，初始化后仍可修改。各字段的含义参阅 [配置文件](/guide/config)。

## 安装依赖 {#install-dependencies}

`bun create kokkoro` 会将项目文件写入新目录，因此安装依赖前需要先进入该目录。下面的命令使用默认项目名称：

```shell
cd kokkoro-app
```

如果在向导中输入了其他项目名称，需要将 `kokkoro-app` 换成实际的文件夹名称。

使用 `kokkoro init` 时，当前目录已经是项目目录。接下来，在项目目录中安装依赖：

```shell
bun install
```

安装完成后，Bun 会创建 `node_modules` 目录和 `bun.lock` 文件。项目依赖和 `start` 脚本已经由初始化工具写入 `package.json`，不需要手动添加。

## 启动项目 {#start-project}

在项目目录中运行 `start` 脚本：

```shell
bun start
```

前面已经全局安装 Kokkoro CLI，因此也可以使用下面的命令启动同一个项目：

```shell
kokkoro start
```

Kokkoro 启动时，终端会显示类似下面的日志。时间、AppID 和机器人名称以当前项目为准：

```text
[2026-09-03T08:32:45.461Z] INFO kokkoro - 正在启动
[2026-09-03T08:32:45.474Z] INFO kokkoro - 服务已启动 http://localhost:3000/
[2026-09-03T08:32:46.122Z] INFO kokkoro:123456789:websocket - 已连接 可可萝
[2026-09-03T08:32:46.139Z] INFO kokkoro - 启动完成 WebSocket 1 WebHook 0
```

日志中的「WebSocket 1」表示一个 WebSocket 机器人已经连接到 QQ，此时 Kokkoro 已完成启动。

现在可以在 QQ 中向机器人发送消息。下面以群聊为例，先 @ 机器人再发送「你好」：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 你好</ChatMessage>
</ChatPanel>

Kokkoro 收到消息后，会在终端中输出事件内容：

```text
[2026-09-03T08:33:12.265Z] INFO kokkoro:123456789 - 收到群聊 @ 消息 {
  id: "...",
  group_openid: "...",
  member_openid: "...",
  content: " 你好",
}
```

机器人暂时不会回复，因为当前项目还没有插件处理这条消息。

如果没有看到上述结果，可以按以下情况排查：

- **没有出现「已连接」**：核对 [`kokkoro.json`](/guide/config) 中的机器人凭证和接入方式。
- **机器人已经连接，发送消息后没有新日志**：确认当前 QQ 账号或群聊已经加入机器人的测试范围。
- **群聊中的普通消息没有新日志**：群聊未开启「获取群内全部消息」时，需要先 @ 机器人。

## 添加插件 {#add-plugins}

Kokkoro 可以加载项目中的本地插件，也可以加载通过 npm 安装的插件。

### 创建本地插件 {#create-local-plugin}

回到运行 Kokkoro 的终端，按 **Ctrl+C** 停止项目，再创建示例插件：

```shell
kokkoro plugin example
```

该命令会在 `plugins/example` 中创建插件。创建完成后，再安装一次依赖，让 Bun 将新插件链接到当前项目：

```shell
bun install
```

重新启动项目：

```shell
bun start
```

示例插件注册了 `/ping` 指令。在群聊中 @ 机器人并发送该指令，机器人会回复「pong」：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /ping</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">pong</ChatMessage>
</ChatPanel>

### 安装 npm 插件 {#install-npm-plugin}

通过 npm 发布的插件可以直接安装为项目依赖。下面以 Kokkoro 官方的一言插件为例。回到运行 Kokkoro 的终端，按 **Ctrl+C** 停止项目，再安装插件：

```shell
bun add kokkoro-plugin-hitokoto
```

重新启动项目后，Kokkoro 会自动加载该插件：

```shell
bun start
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /一言</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">『大部分人并不想长大，只是没办法继续当一个小孩子。』——「小林家的龙女仆」</ChatMessage>
</ChatPanel>

更多官方插件参阅 [官方插件](/plugin/official)，社区维护的插件可以在 [插件市场](/plugin/market) 中查找。[命令行工具](/guide/cli) 列出了 Kokkoro CLI 的其他命令。

接下来可以阅读 [插件概述](/develop/overview)，了解插件的结构和加载方式。

现在，开启一段属于你的物语吧 ♪ q(≧▽≦q)
