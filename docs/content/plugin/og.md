# Open Graph 预览图 {#open-graph-image}

`kokkoro-plugin-og` 会读取网页声明的 Open Graph 预览图，并将图片发送到当前私聊或群聊。

## 安装 {#installation}

在 Kokkoro 项目目录中安装插件：

```shell
bun add kokkoro-plugin-og
```

安装完成后，重新启动项目，Kokkoro 会自动加载插件。

## 主动预览 {#manual-preview}

将网页地址写在 `/og` 后面，可以主动获取预览图片：

```text
/og https://ogp.me/
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">/og https://ogp.me/</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <img width="200" src="https://ogp.me/logo.png" />
  </ChatMessage>
</ChatPanel>

链接格式无效、网页没有声明预览图片或请求失败时，机器人会回复错误提示。

## 自动预览 {#automatic-preview}

一条普通消息中只有一个 HTTP 或 HTTPS 链接时，插件也会自动尝试获取预览图片：

```text
https://ogp.me/
```

自动预览失败时，插件不会回复或记录错误，以免无效链接打断普通聊天。

只有在群聊中开启「获取群内全部消息」权限后，普通群消息才能触发自动预览。未开启该权限时，需要在消息中 @ 机器人。

## 预览图片来源 {#preview-image-source}

插件只读取页面中的 Open Graph 图片信息，不会使用 Twitter Card、oEmbed 或正文中的普通图片作为替代预览。
