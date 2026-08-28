# kokkoro-plugin-saucenao

使用 SauceNAO 搜索图片来源。

## 安装

```shell
bun add kokkoro-plugin-saucenao
```

## 指令

```text
/搜图
```

发送「/搜图」时附带图片，插件会搜索消息中的第一张图片，并以 Markdown 返回搜索结果，默认显示相似度最高的 3 条。

## 快捷方式

发送「搜图」时附带图片，也会返回搜索结果。群聊需要开启「获取群内全部消息」权限。

```text
搜图
```

## 环境变量

使用插件前，需要在项目根目录的 `.env` 文件中填写 [SauceNAO API Key](https://saucenao.com/user.php?page=search-api)。

```ini
SAUCENAO_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SAUCENAO_NUMRES=3
SAUCENAO_SIMILARITY_THRESHOLD=50
```

`SAUCENAO_NUMRES` 表示返回结果数量，默认值为 `3`。

`SAUCENAO_SIMILARITY_THRESHOLD` 表示显示原缩略图的最低相似度，默认值为 `50`。低于该数值时，插件会使用表情包替换缩略图，避免搜出奇怪的图社死。
