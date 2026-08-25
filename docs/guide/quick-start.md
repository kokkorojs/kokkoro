# 快速上手

::: tip 准备工作
在开始前，请先确保你安装了 **18.0.0** 或以上版本的 [Node.js](https://nodejs.org/zh-cn/)，并在 [QQ 开放平台](https://bot.q.qq.com/wiki/develop/api-v2/) 创建好了机器人。
:::

## 项目构建

你可以打开终端，使用下列命令来初始化项目：

::: code-group

```shell [npm]
# 安装 Kokkoro 脚手架
npm i @kokkoro/cli -g

# 初始化项目
kokkoro init
```

```shell [yarn]
# 安装 Kokkoro 脚手架
yarn global add @kokkoro/cli

# 初始化项目
kokkoro init
```

:::

若下载较慢，可以尝试使用淘宝镜像源：

::: code-group

```shell [npm]
npm config set registry https://registry.npmmirror.com
```

```shell [yarn]
yarn config set registry https://registry.npmmirror.com
```

:::

::: danger 不要使用 PNPM
使用 pnpm 可能会导致很多预期之外的问题，我更推荐使用 npm 或者 yarn 来管理 Kokkoro 项目。
:::

![](https://camo.githubusercontent.com/8325363bff130976c862214c3af00c483f26de09ba7e4c31c54bdc14c08c3c55/68747470733a2f2f7062732e7477696d672e636f6d2f6d656469612f444549565f3158577341416c5932392e6a7067)

因为 Kokkoro 十分轻便，所以也不用太担心内存占用的问题。至于不使用 pnpm 的原因，你可以 [在这里](/about/faq) 找到答案。

## 目录结构

当你使用 `init` 命令做好相关配置后， Kokkoro 将会为你在指定目录自动生成下列目录结构。

```tex
.
├─ data/              项目资源
├─ logs/              日志列表
├─ plugins/           插件目录（存放编写好的插件）
├─ index.js           程序入口
└─ kokkoro.json       配置文件
```

接下来，你便可以参考终端的相关提示，安装依赖项：

::: code-group

```shell [npm]
# 切换至项目根目录
cd robot

# 安装依赖
npm i
```

```shell [yarn]
# 切换至项目根目录
cd robot

# 安装依赖
yarn
```

:::

等待安装命令执行完毕后，你会发现，在项目根目录下又生成了 `node_modules` 和 `package.json` 这两个文件，后面在 [插件开发](/develop/application) 中将会为你详细介绍。

如果你不准备开发插件，就不用去关心这些**依赖文件**，感兴趣你也可以先使用搜索引擎查找相关知识。

## 启动程序

一切准备就绪，现在开始启动你的项目：

```shell
kokkoro start
```

如果你没有**全局安装** CLI，也可以使用下列命令：

::: code-group

```shell [npm]
npm run start
```

```shell [yarn]
yarn start
```

:::

如上述步骤无误，在项目启动后，便会开始为机器人建立会话通信。要是出现 Socket 无法正常通信，或者是成功连接但没有接收到事件通知，就要在 `kokkoro.json` 中检查 `events` 参数是否正确配置。

## 插件扩展

你可以直接安装 npm 插件来为自己的机器人扩展相对应的功能，例如：

::: code-group

```shell [npm]
npm i kokkoro-plugin-hitokoto
```

```shell [yarn]
yarn add kokkoro-plugin-hitokoto
```

:::

程序会在项目启动后（机器人建立会话通信前），**自动挂载**项目内的所有插件，不用执行额外操作。

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki" at="可可萝">/来点骚话</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">『大部分人并不想长大，只是没办法继续当一个小孩子。』——「小林家的龙女仆」</ChatMessage>
</ChatPanel>

现在，开启一段属于你的物语吧 ♪ q(≧▽≦q)

当然，如果你有 JavaScript 的相关知识，随时都可以编写自己的插件，详情可在 [插件开发](/develop/overview) 一栏查看，更多插件安装和使用说明可以在 [插件社区](/plugin/awesome) 中查找。
