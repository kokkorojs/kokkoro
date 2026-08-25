# 概述

::: tip 插件介绍
在编写插件之前，我们首先要了解插件的类型。在项目初始化时就已经为大家做了初步介绍，插件共分为**本地插件**和 **npm 插件**两大类。
:::

## 本地插件

- 本地插件默认存放在项目根目录的 `plugins` 文件夹下，可通过 `kokkoro.json` 修改。
- 所有由你自己编写，并**仅供个人使用**的插件就可以称为本地插件。

## npm 插件

- npm 插件都是直接使用包管理工具安装（npm、yarn），存放在 `node_modules` 目录下。
- 是由我或者其他开发者编写，上传至 [npmjs](https://www.npmjs.com/) 平台，为**所有使用 Kokkoro 的人**提供服务。

## 命名规范

世界上不存在两片一模一样的叶子，插件也是如此。

Kokkoro 不存在两个名字一模一样的插件，所有插件都是使用其模块的 `metadata.name` 变量，来作为自身的**唯一标识**。

如果你想开发插件并发布，那么要将插件以 `kokkoro-plugin` 作为前缀。例如 `example` 插件，使用 `kokkoro-plugin-example` 作为模块名，否则会导致插件无法被正常检索。

## 目录结构

你可以在项目根目录下，使用 `kokkoro plugin <name>` 指令来快速创建插件模板。

```shell
kokkoro plugin example
```

你可以自由选择你想使用的插件风格，这里我们以默认的 JavaScript 为例：

```shell
✔ Which plugin style would you like to use:
>   Javascript
    Typescript (Hook)
    Typescript (Decorator)

INFO plugin module create successful.
```

```tex
plugins/
└─ example/
   ├─ index.js        程序入口
   └─ package.json    包管理文件
```
