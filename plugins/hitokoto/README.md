# kokkoro-plugin-hitokoto

ヒトコト

## 安装

```shell
bun add kokkoro-plugin-hitokoto
```

## 指令

发送「/一言」，插件默认会从一言接口随机返回一条动画或漫画语句。

## 快捷方式

也可以发送「来点骚话」触发，群聊需要开启「获取群内全部消息」权限。

## 环境变量

如需修改语句类型，请在项目根目录创建 `.env` 文件，并通过 `HITOKOTO_TYPES` 设置一言接口的 `c` 参数。多个类型使用逗号分隔，默认值为 `a,b`。

```ini
HITOKOTO_TYPES=c,d
```

类型取值参阅[一言接口文档](https://developer.hitokoto.cn/sentence/#请求参数)。修改 `.env` 后需要重新启动项目。
