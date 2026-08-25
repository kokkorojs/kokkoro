# 计划

::: danger
当前页面是 v1 时期的文档，内容已过时，将会在近期更新。
:::

::: tip
🟢 已完成 🔵 待优化 🟡 进行中 🔴 咕咕咕
:::

## 核心库

| Tables       | Cool |
| ------------ | ---- |
| 多 bot 管理  | 🟢   |
| 数据库支持   | 🟢   |
| web 路由服务 | 🔵   |
| admin 后台   | 🔵   |
| QQ 频道支持  | 🔴   |

## 插件适配

| Tables      | Cool |
| ----------- | ---- |
| cherugo     | 🟢   |
| hitokoto    | 🟢   |
| group       | 🟢   |
| setu        | 🟢   |
| chatgpt     | 🟢   |
| rss         | 🟡   |
| saucenao    | 🔵   |
| pcr         | 🟡   |
| sandbox     | 🔴   |
| aircon      | 🟢   |
| chess       | 🔴   |
| guess       | 🔴   |
| lifeRestart | 🔴   |
| qa          | 🔴   |
| galgame     | 🔴   |

## onebot

以前有人问过我，会不会对接 onebot，我明确表示过不会做，**至少在现阶段** 我没有任何计划。

kokkoro 的初衷是让任何人，包括小白，都能极其简单的上手 QQ 机器人插件开发。仅需一个 node 环境，不用任何额外的配置与高门槛编程基础就能开箱即用，她现在也确实做到了。

## database

在最开始，yumemi 是基于 sqlite 实现数据存储的，但是有许许多多的问题。

使用 javascript 做开发的大多数是前端人员，有相当一部分人对于 SQL 并不熟悉。而且 sqlite3 需要用到 ”臭名昭著“ 的 node-gyp，在国内的话经常会装不上依赖，这非常消磨开发热情。

重构 kokkoro 后，我自己封装了一套基于 JSON 的数据库，和 object 的操作没任何区别，唯一的不同是会将对象数据存储在本地以用作数据持久化。

到现在，我选择使用 leveldb 作为 kokkoro 的 **唯一指定数据库**，未来不会提供例如 mysql、mongodb 等中间件，如果有需要你可以在自己的插件里引入相关依赖库去实现。
