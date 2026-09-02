# kokkoro-plugin-hitokoto

Hitokoto 一言，随机获取动漫、小说、诗词等类型的语句。

## 安装

在 Kokkoro 项目目录运行：

```shell
bun add kokkoro-plugin-hitokoto
```

## 指令

```text
/一言 [types]...
```

`[types]...` 表示可选的类型参数，可以填写一个或多个中文类型名称。多个名称使用空格分隔。支持动画、漫画、游戏、文学、原创、来自网络、其他、影视、诗词、网易云、哲学和抖机灵。

不填写类型时，插件随机返回一条语句。

```text
/一言
/一言 动画 漫画 游戏
```

## 快捷方式

快捷方式匹配以下正则表达式：

```regexp
/^来点(?<types>.+)?骚话$/
```

其中的 `types` 表示「来点」和「骚话」之间可选的类型名称。以下消息都能触发快捷方式：

```text
来点骚话
来点诗词骚话
```

要让普通群消息触发快捷方式，需要在对应群聊中开启「获取群内全部消息」权限。未开启时，插件只能处理 @ 机器人的群消息。

## API

其他插件可以从包入口导入 `fetchSentence()` 使用，该函数返回一言接口的完整语句对象：

```typescript
import { fetchSentence } from 'kokkoro-plugin-hitokoto';

const sentence = await fetchSentence('i');
```

`fetchSentence()` 接收一言接口的类型代码或代码数组。`'i'` 表示诗词，`['a', 'b']` 表示动画和漫画。传入空数组时，函数不限制语句类型。

请求失败时，`fetchSentence()` 会抛出 `Error`。一言错误响应使用上游的 `message`，其他请求错误使用 HTTP 状态码。包同时导出 `Sentence`、`SentenceType` 和 `ErrorResponse` 类型，以及 `isErrorResponse()` 类型守卫。

## 环境变量

调用 `fetchSentence()` 时省略类型参数，函数会读取环境变量 `HITOKOTO_TYPES`。如需设置该变量，请在项目根目录创建 `.env` 文件。多个类型代码使用逗号分隔。未设置时，函数不限制语句类型。

```ini
HITOKOTO_TYPES=a,b,c
```

示例中的 `a`、`b` 和 `c` 分别表示动画、漫画和游戏。其他类型代码参阅 [一言接口文档](https://developer.hitokoto.cn/sentence/#请求参数)。修改 `.env` 后需要重新启动项目。
