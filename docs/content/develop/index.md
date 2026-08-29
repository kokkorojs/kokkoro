# 插件概述

::: tip 插件介绍
在编写插件之前，我们首先要了解插件的类型。在项目初始化时就已经为大家做了初步介绍，插件共分为**本地插件**和**社区插件**两大类。
:::

## 本地插件

- 本地插件默认存放在项目根目录的 `plugins` 文件夹下。
- 所有由你自己编写，并**仅供个人使用**的插件就可以称为本地插件。

## 社区插件

- 社区插件通过 Bun 安装，并存放在 `node_modules` 目录下。
- 由我或者其他开发者编写并发布到 [npm](https://www.npmjs.com/)，为**所有使用 Kokkoro 的人**提供服务。

## 插件标识

世界上不存在两片一模一样的叶子，插件也是如此。

Kokkoro 使用 `package.json` 中的 `name` 作为插件的**唯一标识**，因此两个插件不能使用相同的名称。

如果本地插件不存在 `package.json`，则会使用插件文件夹名称作为唯一标识。

使用 CLI 创建插件时，`package.json` 中的 `name` 会自动添加 `kokkoro-plugin-` 前缀。例如，`kokkoro plugin example` 创建的包名是 `kokkoro-plugin-example`。发布社区插件时请保留该前缀，否则 Kokkoro 不会从项目的 `dependencies` 中发现该插件。

## 目录结构

你可以在项目根目录下，使用 `kokkoro plugin <name>` 指令来快速创建插件模板。

```shell
kokkoro plugin example
```

命令执行完成后，会在 `plugins` 中创建以下文件：

```text
plugins/
└── example/
    ├── src/
    │   └── index.ts     程序入口
    └── package.json     包配置文件
```

## 插件入口

每个插件都是一个独立的模块，默认导出的同步函数就是**插件入口**。Kokkoro 将这个函数称为 `PluginSetup`。

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', () => 'pong');
};
```

`useCommand()`、`useEvent()` 等用于声明插件功能的函数称为 **Hook**。

插件每挂载到一个 Bot，`PluginSetup` 就会执行一次，并在函数中登记当前 Bot 使用的 Hook。

`Bot` 继承 Chobits 的 `Client`，可以直接调用 QQ 官方接口。插件需要使用这些方法时，可以通过函数参数获取当前 Bot。不需要时，则可以像上面的示例一样省略参数。

Hook **只能**在 `PluginSetup` 或由它同步调用的函数中声明，`PluginSetup` 本身不能是异步函数。它还可以返回一个清理函数。插件从当前 Bot 取消挂载时，Kokkoro 会执行这个函数。

模块顶层代码与 `PluginSetup` 的执行时机并不相同，详细规则请参阅 [生命周期](/develop/lifecycle) 和 [副作用清理](/develop/cleanup)。

## 加载规则

Kokkoro 只会查找 `plugins` 中的一级子文件夹。项目插件可以不提供 `package.json`，此时 Bun 会按照模块解析规则查找目录中的 `index.ts` 等入口文件。

社区插件来自项目 `package.json` 的 `dependencies`，包名需要以 `kokkoro-plugin-` 开头。Kokkoro 不会遍历 `node_modules` 或加载 `devDependencies` 中的插件。

项目插件会先于社区插件加载。项目插件按照文件夹路径排序，社区插件按照包名排序。

每个插件模块只会导入一次，同一个 `PluginSetup` 则会挂载到配置中的每个 Bot。某个插件加载或挂载失败时，Kokkoro 会记录错误，并继续处理其他插件。
