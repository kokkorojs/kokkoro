# create-kokkoro

Kokkoro QQ 机器人框架的项目创建工具。按照终端提示填写配置，即可生成项目目录和启动文件。

使用前需要安装 [Bun](https://bun.com/docs/installation)，它负责安装项目依赖和运行 Kokkoro。

## 创建项目

在终端中进入准备存放项目的目录，运行：

```shell
bun create kokkoro
```

按照提示输入项目名称、服务端口、QQ 服务接入方式和机器人配置。直接按回车可使用默认项目名称 `kokkoro-app` 和端口 `3000`。

本地开发可以选择 WebSocket。添加机器人时，需要填写从 QQ 开放平台获取的 AppID 和 ClientSecret。还没有机器人时，可以在“是否添加机器人”处选择“否”，以后再修改 `kokkoro.json`。具体操作见[快速上手](https://kokkoro.js.org/guide/quick-start)。

## 启动项目

创建完成后，进入生成的文件夹，安装依赖并启动服务。下面使用默认项目名称：

```shell
cd kokkoro-app
bun install
bun start
```

如果使用了其他名称，将 `kokkoro-app` 换成对应的文件夹名称。终端显示“服务已启动”后，说明 HTTP 服务已经运行。按 `Ctrl+C` 可以停止服务。

## 项目文件

生成的项目包含以下内容：

| 路径           | 用途                    |
| -------------- | ----------------------- |
| `kokkoro.json` | 保存机器人和服务配置    |
| `main.ts`      | 启动 Kokkoro 的入口文件 |
| `plugins/`     | 存放自己编写的插件      |
| `package.json` | 声明项目依赖和启动命令  |

如果同名文件夹已经存在且不为空，创建过程会停止。需要覆盖已有模板文件时，可以运行 `bun create kokkoro --force`，其他文件会保留。覆盖范围见[创建项目](https://kokkoro.js.org/guide/cli#create-project)。

## 接下来

- [配置文件](https://kokkoro.js.org/guide/config)，修改机器人凭证、端口和接入方式。
- [编写第一个插件](https://kokkoro.js.org/develop/first-plugin)，为机器人添加功能。
- [命令行工具](https://kokkoro.js.org/guide/cli)，使用 `kokkoro` 命令创建插件和启动项目。
