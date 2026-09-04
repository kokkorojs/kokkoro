# kokkoro-plugin-og

解析消息中的网页链接，并发送页面声明的 Open Graph 预览图片。

## 安装

```shell
bun add kokkoro-plugin-og
```

使用 `/og <url>` 主动解析网页。一条普通消息中只出现一个 HTTP 或 HTTPS 链接时，快捷方式也会自动解析该链接。

使用 `/og` 解析失败时，机器人会回复错误信息。快捷方式解析失败时，机器人不会回复消息，也不会记录错误。插件不会使用 Twitter Card、oEmbed 或网页中的普通图片作为预览图。

要处理群聊中的普通消息，请在对应群聊中开启「获取群内全部消息」权限。未开启时，插件只能处理 @ 机器人的群消息。

## API

其他插件可以从 `service` 入口导入 `fetchImageUrl()`，获取网页声明的 Open Graph 预览图片地址：

```typescript
import { fetchImageUrl } from 'kokkoro-plugin-og/service';

const imageUrl = await fetchImageUrl(new URL('https://ogp.me/'));
```
