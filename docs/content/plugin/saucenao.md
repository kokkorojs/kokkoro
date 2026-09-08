# SauceNAO 图片搜索 {#saucenao}

`kokkoro-plugin-saucenao` 使用 [SauceNAO](https://saucenao.com/) 搜索图片来源，并通过 QQ Markdown 消息展示结果。

::: important
使用 SauceNAO API 前，需要先[申请 API Key](https://saucenao.com/user.php?page=search-api)，并完成[环境变量配置](#configuration)。
:::

## 安装 {#installation}

在 Kokkoro 项目目录中安装插件：

```shell
bun add kokkoro-plugin-saucenao
```

安装完成后，重新启动项目，Kokkoro 会自动加载插件。

## 搜索图片来源 {#search-image-source}

发送带有图片的 `/搜图` 指令后，插件会搜索消息中的第一张图片。下面的聊天记录只展示第一条搜索结果：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">
    <span>/搜图</span>
    <img width="200" src="/74237509.jpg" />
  </ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <h3>SauceNAO 搜图结果</h3>
    <hr />
    <h4>1. 猫耳コッコロちゃん</h4>
    <ul>
      <li>相似度：98.3%</li>
      <li>平台：Pixiv Images</li>
    </ul>
    <img width="200" src="/74237509.jpg" />
    <a href="https://www.pixiv.net/artworks/74237509">查看来源</a>
  </ChatMessage>
</ChatPanel>

消息中没有图片、接口请求失败或没有搜索结果时，机器人会回复对应的错误信息。

## 快捷方式 {#shortcut}

发送带有图片的「搜图」消息，也会执行相同的搜索。要让普通群消息触发快捷方式，需要开启「获取群内全部消息」权限。

## 配置 {#configuration}

使用插件前，需要从 [SauceNAO](https://saucenao.com/user.php?page=search-api) 获取 API Key，并写入项目根目录的 `.env`：

```ini
SAUCENAO_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SAUCENAO_NUMRES=3
SAUCENAO_SIMILARITY_THRESHOLD=50
```

- **SAUCENAO_API_KEY**：SauceNAO API Key，必须填写。
- **SAUCENAO_NUMRES**：返回的搜索结果数量，默认值为 `3`。
- **SAUCENAO_SIMILARITY_THRESHOLD**：显示 SauceNAO 缩略图所需的最低相似度，默认值为 `50`。低于该数值时，插件会用表情包替换缩略图，避免展示不相关的图片。

修改 `.env` 后，需要重新启动项目。
