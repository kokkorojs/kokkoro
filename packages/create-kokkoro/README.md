# create-kokkoro

Kokkoro QQ 机器人框架的项目创建工具。

## 使用

运行以下命令创建 Kokkoro 项目：

```shell
bun create kokkoro
```

命令会创建项目目录、`plugins` 目录、`package.json`、`kokkoro.json` 和 `main.ts`。

如果项目目录不是空目录，创建将中止。使用 `--force` 选项可以覆盖脚手架创建的同名文件，目录中的其他内容不受影响。

```shell
bun create kokkoro --force
```

## 配置项目

命令会依次询问以下内容：

1. 输入项目名称，默认值为 `kokkoro-app`。
2. 输入服务端口，默认值为 `3000`。
3. 选择 QQ 服务接入方式，可选 `WebSocket` 或 `WebHook`。
4. 选择是否添加机器人。不添加机器人时，`kokkoro.json` 中的 `bots` 为空数组。
5. 添加机器人时，输入机器人的 `AppID` 和 `ClientSecret`。
6. 使用 `WebHook` 并添加机器人时，输入 WebHook 路径，默认值为 `/callback`。

### 启动项目

创建完成后，进入项目目录并安装依赖：

```shell
cd kokkoro-app

bun install
bun start
```

将 `kokkoro-app` 替换为你输入的项目名称。
