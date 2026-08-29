# 快速上手

::: tip 准备工作
在开始前，请先确保你安装了 [Bun](https://bun.com)，并在 [QQ 开放平台](https://q.qq.com) 创建好了机器人。
:::

## 初始化项目

Kokkoro 提供两种初始化方式。`bun create` 创建新目录，`kokkoro init` 初始化当前目录。

### 创建新项目

如果你还没有创建项目目录，可以直接使用 Bun 的项目创建命令：

```shell
bun create kokkoro
```

命令启动后，会依次询问以下内容：

1. `项目名称`：项目目录的名称，默认为 `kokkoro-app`。
2. `服务端口`：Kokkoro 服务使用的端口，默认为 `3000`。
3. `QQ 服务接入方式`：首次在本地运行时，建议选择 `WebSocket`。使用 `WebHook` 时需要公网环境。
4. `是否添加机器人`：为了完成本页后续的消息交互，请选择 `是`。
5. `机器人 AppID` 和 `机器人 ClientSecret`：填写 QQ 开放平台中的机器人凭证。
6. `WebHook 路径`：选择 `WebHook` 并添加机器人时需要填写，默认为 `/callback`。

配置完成后，脚手架会以项目名称创建目录，并生成项目所需的文件。

创建完成后，进入项目目录：

```shell
cd kokkoro-app
```

请将 `kokkoro-app` 替换为你输入的项目名称。

### 初始化当前目录

如果你希望自行创建项目目录，可以全局安装 Kokkoro CLI，再通过 `init` 命令初始化当前目录：

```shell
# 安装 Kokkoro CLI
bun add --global @kokkoro/cli

# 创建并进入项目目录
mkdir kokkoro-app
cd kokkoro-app

# 初始化当前目录
kokkoro init
```

`kokkoro init` 不会询问项目名称，而是直接使用当前目录。除此之外，两种方式的配置过程和生成内容完全相同。

如果目标目录不是空目录，脚手架会停止创建项目。添加 `--force` 选项后，脚手架会覆盖同名的模板文件，并保留目录中的其他内容。

::: code-group

```shell [创建新项目]
bun create kokkoro --force
```

```shell [初始化当前目录]
kokkoro init --force
```

:::

## 目录结构

项目初始化完成后，Kokkoro 会生成以下目录结构：

```text
.
├── plugins/       插件目录
├── kokkoro.json   配置文件
├── main.ts        程序入口
└── package.json   包配置文件
```

## 安装依赖

安装项目依赖：

```shell
bun install
```

安装完成后，Bun 会生成 `node_modules` 目录和 `bun.lock` 文件。`package.json` 已由脚手架创建，其中记录了项目依赖和启动命令。

如果需要修改接入方式、服务端口或机器人凭证，请参阅 [配置文件](/guide/config)。

## 启动项目

启动项目：

```shell
bun start
```

如果你已经全局安装 Kokkoro CLI，也可以直接运行：

```shell
kokkoro start
```

启动后，Kokkoro 会加载项目内的插件并启动 HTTP 服务，再为使用 WebSocket 的机器人建立连接。WebHook 机器人会通过各自的回调路由等待 QQ 推送事件。

终端输出 `服务已启动` 和 `启动完成`，表示 Kokkoro 已完成启动。WebSocket 机器人连接成功时还会输出 `已连接`。

如果 WebSocket 无法建立连接，或 WebHook 没有收到事件，请检查 [`kokkoro.json`](/guide/config) 和 [QQ 机器人管理后台](https://q.qq.com/qqbot/dashboard) 中的接收事件配置。

## 添加插件

你可以直接安装**社区插件**，为机器人添加更多功能：

```shell
bun add kokkoro-plugin-hitokoto
```

安装完成后，重新启动项目。Kokkoro 会自动加载该插件。

<ChatPanel self="2225151531">
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/一言</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">『大部分人并不想长大，只是没办法继续当一个小孩子。』——「小林家的龙女仆」</ChatMessage>
</ChatPanel>

更多插件可以在 [插件市场](/plugin/market) 中查找。

如果社区插件没有你需要的功能，也可以开发自己的插件。使用 Kokkoro CLI 即可创建一个**本地插件**：

```shell
kokkoro plugin example
```

如果你没有全局安装 CLI，也可以通过 `bunx` 运行该命令：

```shell
bunx @kokkoro/cli plugin example
```

命令会在 `plugins/example` 中创建插件模板。重新启动项目后，向机器人发送 `/ping`，机器人会回复 `pong`。

<ChatPanel self="2225151531">
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/ping</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">pong</ChatMessage>
</ChatPanel>

模板中的 `/ping` 指令只是一个最小示例。你可以使用 `useCommand()`、`useEvent()` 等 Hook API 开发插件，详情参阅 [插件概述](/develop/)。

现在，开启一段属于你的物语吧 ♪ q(≧▽≦q)
