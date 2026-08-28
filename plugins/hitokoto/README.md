# kokkoro-plugin-hitokoto

ヒトコト

## 安装

```shell
bun add kokkoro-plugin-hitokoto
```

## 指令

```text
/一言 [types]...
```

`types` 是可选的一言类型。不填写时，插件默认会从一言接口随机返回一条动画或漫画语句。

```text
/一言
```

填写类型可以限定本次返回的语句，多个类型使用空格分隔。

```text
/一言 诗词 文学
```

支持动画、漫画、游戏、文学、原创、来自网络、其他、影视、诗词、网易云、哲学和抖机灵。

## 快捷方式

发送「来点骚话」也会随机返回一条语句，群聊需要开启「获取群内全部消息」权限。

```text
来点骚话
```

## 环境变量

如需修改默认语句类型，请在项目根目录创建 `.env` 文件，并通过 `HITOKOTO_TYPES` 设置一言接口的 `c` 参数。多个类型使用逗号分隔，默认值为 `a,b`。

```ini
HITOKOTO_TYPES=c,d
```

类型取值参阅[一言接口文档](https://developer.hitokoto.cn/sentence/#请求参数)。修改 `.env` 后需要重新启动项目。
