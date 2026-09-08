# 部署 {#deployment}

在 Linux 服务器上部署机器人时，除了让它在断开 SSH 连接后继续接收消息，还需要保存运行日志，方便之后排查问题。

开始前，先按照 [快速上手](/guide/quick-start) 确认机器人可以在服务器上正常运行，再按 **Ctrl+C** 停止当前服务。

## PM2 {#pm2}

[PM2](https://pm2.keymetrics.io/docs/usage/quick-start/) 是 Node.js 生态中常用的进程管理工具，可用于在 Linux 服务器上部署 Node.js 服务。它可以让服务在后台持续运行，在服务意外退出时自动重启，并将输出的日志保存到文件中。

例如，在已安装 Node.js 和 PM2 的环境中，可以这样在后台启动入口为 `app.js` 的 Node.js 服务：

```shell
pm2 start app.js
```

在 Bun 项目中，可以通过 `bunx` 运行 PM2，它会在需要时下载并缓存 PM2，供后续命令复用。

PM2 默认使用 Node.js 运行。为了让 PM2 也使用服务器上已有的 Bun，我们给 `bunx` 添加 `--bun` 参数，写作 `bunx --bun pm2`。

## 后台运行 {#start}

快速上手中的 `bun start` 会执行 `bun run main.ts`，下面通过 PM2 执行同一个命令，让机器人在后台运行。

在服务器的项目根目录执行以下命令启动机器人：

```shell
bunx --bun pm2 start bun --name kokkoro -- run ./main.ts
```

这条命令中，`bunx --bun pm2` 用 Bun 运行 PM2 本身，`start bun` 则让 PM2 另外启动一个 Bun 进程来运行 Kokkoro。`--` 后的 `run ./main.ts` 是传给这个 Bun 进程的参数。

`--name kokkoro` 将服务命名为 `kokkoro`，后续查看日志、重启和停止服务时都会用到这个名称。

命令执行后，终端会显示进程列表，你可以继续输入其他命令。`status` 列显示 `online` 表示 Bun 进程已经启动，接下来查看 Kokkoro 的启动日志：

```shell
bunx --bun pm2 logs kokkoro
```

日志中应当出现「启动完成」，具体示例见 [快速上手的启动日志](/guide/quick-start#start-project)。按 **Ctrl+C** 退出日志查看后，机器人仍在后台运行，断开 SSH 连接也不会停止服务。

## 查看日志 {#logs}

通过 PM2 启动服务后，日志会自动保存在当前用户的 `~/.pm2/logs/` 目录。示例中的普通输出保存在 `kokkoro-out.log`，警告和错误保存在 `kokkoro-error.log`，服务停止后也能查看这些文件。

需要查看更多历史日志时，可以用下面的命令显示每个日志文件的最近 100 行，并继续查看新日志：

```shell
bunx --bun pm2 logs kokkoro --lines 100
```

日志默认持续追加，文件会随运行时间增长。其他查看选项见 [PM2 日志管理](https://pm2.keymetrics.io/docs/usage/log-management/)。

## 停止和重启 {#manage}

修改 `kokkoro.json` 或更新插件后，执行重启命令，Kokkoro 会重新读取配置并加载插件。修改 `.env` 后，保留 `--update-env`，让 PM2 将新的变量值传给重启后的服务。

| 操作                        | 命令                                          |
| --------------------------- | --------------------------------------------- |
| 查看状态                    | `bunx --bun pm2 list`                         |
| 重启服务                    | `bunx --bun pm2 restart kokkoro --update-env` |
| 停止服务                    | `bunx --bun pm2 stop kokkoro`                 |
| 停止并从 PM2 进程列表中移除 | `bunx --bun pm2 delete kokkoro`               |

服务器重启后，再执行 [后台运行](#start) 中的命令启动服务。

## 自定义入口 {#custom-entry}

入口文件位于 `src/main.ts` 时，使用下面的命令：

```shell
bunx --bun pm2 start bun --name kokkoro -- run ./src/main.ts
```

命令仍在包含 `kokkoro.json` 的项目根目录执行。文件路径的写法见 [自定义入口](/guide/cli#custom-entry)。
