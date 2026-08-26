# @kokkoro/cli

Kokkoro QQ 机器人框架的命令行工具。

## 安装

```shell
bun add --global @kokkoro/cli
```

安装后可以在终端直接使用 `kokkoro` 命令。
如果不想全局安装 CLI，也可以通过 `bunx` 运行命令：

```shell
bunx @kokkoro/cli init
```

## 初始化项目

先创建并进入项目目录，再运行 `init`。

```shell
mkdir kokkoro-app
cd kokkoro-app
kokkoro init
```

按照提示输入服务端口、QQ 服务接入方式和机器人配置。命令会在当前目录创建 `plugins` 目录、`package.json`、`kokkoro.json` 和 `main.ts`。

如果当前目录不是空目录，初始化将中止。可以使用 `--force` 或 `-f` 选项覆盖脚手架创建的同名文件，目录中的其他内容不受影响。

```shell
kokkoro init --force
```

## 创建插件

在项目根目录运行以下命令：

```shell
kokkoro plugin example
```

该命令会创建 `plugins/example/package.json` 和 `plugins/example/src/index.ts`。如果插件目录不是空目录，命令将中止。使用 `--force` 或 `-f` 选项可以覆盖模板文件，目录中的其他内容不受影响。

## 启动

```shell
kokkoro start
```

该命令读取当前工作目录的 `kokkoro.json` 文件，并运行配置中的全部机器人。
