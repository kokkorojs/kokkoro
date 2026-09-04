# 命令行工具 {#cli}

Kokkoro 提供两个命令行工具。`create-kokkoro` 用于创建新项目，`@kokkoro/cli` 用于初始化当前目录、创建插件和启动服务。

## 创建项目 {#create-project}

运行以下命令创建一个新的 Kokkoro 项目：

```shell
bun create kokkoro
```

命令会先询问项目名称，再让你填写服务端口、QQ 服务接入方式和机器人配置。选择 WebHook 并添加机器人时，还需要填写 WebHook 路径，默认值为 `/callback`。

配置完成后，`create-kokkoro` 会创建与项目同名的文件夹，并将项目文件写入其中。

如果同名的项目目录已经存在且不为空，创建过程会停止，以免覆盖已有文件。使用 `--force` 或 `-f` 时，模板会覆盖已有的 `package.json`、`kokkoro.json` 和 `main.ts`，目录中的其他文件会保留：

```shell
bun create kokkoro --force
```

## 安装 Kokkoro CLI {#install-cli}

使用 Bun 全局安装 `@kokkoro/cli`：

```shell
bun add --global @kokkoro/cli
```

安装后，可以直接在终端运行 `kokkoro`。`--version` 和 `-v` 会输出版本号，`--help` 和 `-h` 会列出可用命令：

```shell
kokkoro --version
kokkoro --help
```

如果不想全局安装，也可以通过 `bunx` 临时运行 CLI：

```shell
bunx @kokkoro/cli --help
```

## 初始化当前目录 {#initialize-current-directory}

已经按照 [快速上手](/guide/quick-start) 创建过项目时，无需再次初始化。

`kokkoro init` 会将 Kokkoro 项目文件写入当前目录：

```shell
kokkoro init
```

`kokkoro init` 使用与 [创建项目](#create-project) 相同的配置向导，但会将 `plugins/`、`package.json`、`kokkoro.json` 和 `main.ts` 写入当前目录。

如果当前目录不为空，初始化过程会停止，以免覆盖已有文件。使用 `--force` 或 `-f` 时，模板会覆盖已有的 `package.json`、`kokkoro.json` 和 `main.ts`，目录中的其他文件会保留：

```shell
kokkoro init --force
```

## 创建本地插件 {#create-local-plugin}

`kokkoro plugin <name>` 会在当前项目的 `plugins` 目录中创建本地插件。该命令必须在项目根目录中运行。

插件名称使用小写 kebab-case，例如 `example` 或 `qq-tools`。名称以小写字母开头，每段只包含小写字母和数字，段与段之间使用单个连字符。

下面的命令会创建一个名为 `example` 的插件：

```shell
kokkoro plugin example
```

命令会生成 `plugins/example/package.json` 和 `plugins/example/src/index.ts`。创建完成后，再运行一次 `bun install`，让 Bun 将新插件链接到当前项目。

如果插件目录不为空，创建过程会停止。使用 `--force` 或 `-f` 时，模板会覆盖已有的 `package.json` 和 `src/index.ts`，插件目录中的其他文件会保留：

```shell
kokkoro plugin example --force
```

## 启动服务 {#start-service}

`kokkoro start` 会启动当前项目中的 Kokkoro 服务。该命令需要在项目根目录中运行：

```shell
kokkoro start
```

该命令读取当前目录中的 `kokkoro.json`，加载项目插件，启动 HTTP 服务，并启动配置中的全部机器人。
