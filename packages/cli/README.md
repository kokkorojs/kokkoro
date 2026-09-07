# @kokkoro/cli

Kokkoro QQ 机器人框架的命令行工具，用于初始化项目、创建本地插件和启动服务。

## 安装

先安装 [Bun](https://bun.com/docs/installation)，它负责安装项目依赖和运行 Kokkoro。然后在终端中安装 CLI：

```shell
bun add --global @kokkoro/cli
```

安装后可以直接使用 `kokkoro` 命令，也可以通过 `bunx` 临时运行：

```shell
bunx @kokkoro/cli --help
```

## 初始化项目

下面的命令会新建 `kokkoro-app` 文件夹，并在其中初始化项目：

```shell
mkdir kokkoro-app
cd kokkoro-app
kokkoro init
bun install
```

运行 `init` 时，按照提示配置服务端口、QQ 服务接入方式和机器人。不了解这些选项时，可以跟随[快速上手](https://kokkoro.js.org/guide/quick-start)完成配置。

命令会创建 `package.json`、`kokkoro.json`、`main.ts` 和 `plugins` 目录，`bun install` 用于安装项目所需的依赖。下文中的“项目目录”就是包含 `kokkoro.json` 的文件夹。

## 创建插件

插件用来为机器人添加功能。在项目目录运行以下命令，生成插件模板并同步工作区依赖：

```shell
kokkoro plugin example
bun install
```

命令会在 `plugins/example` 中生成 `package.json` 和 `src/index.ts`，可以从修改 `src/index.ts` 开始编写插件。将 `example` 换成自己的插件名称，例如 `qq-tools`。详细步骤见[编写第一个插件](https://kokkoro.js.org/develop/first-plugin)。

## 启动服务

在项目目录运行以下命令，默认通过 Bun 执行 `main.ts`，读取配置并加载插件：

```shell
kokkoro start
```

按 `Ctrl+C` 可以停止服务。添加插件后，如果项目已经在运行，需要重启服务才能加载新插件。

如果把入口文件移到了 `src/main.ts`，可以指定新的位置：

```shell
kokkoro start src/main.ts
```

指定入口后仍需在项目目录运行命令，路径规则见[启动服务](https://kokkoro.js.org/guide/cli#start-service)。

## 覆盖已有模板

`init` 和 `plugin` 默认不会覆盖非空目录。确实需要重新生成模板文件时，可以添加 `--force` 或 `-f`：

```shell
kokkoro init --force
kokkoro plugin example --force
```

这会覆盖模板对应的同名文件，保留目录中的其他文件。具体范围见[初始化当前目录](https://kokkoro.js.org/guide/cli#initialize-current-directory)和[创建本地插件](https://kokkoro.js.org/guide/cli#create-local-plugin)。
