# kokkoro-plugin-og

解析消息中的网页链接，并发送页面声明的 Open Graph 预览图片。

## 安装

```shell
bun add kokkoro-plugin-og
```

使用 `/og <url>` 主动解析网页。单独发送一个 HTTP 或 HTTPS 链接时，快捷方式也会自动解析该链接，链接两侧可以留有空白。

要让普通群消息触发自动预览，需要开启「获取群内全部消息」权限。

完整使用说明见 [Open Graph 预览图](https://kokkoro.js.org/plugin/og)。

## 配置

`OG_TIMEOUT` 设置请求超时时间，单位为毫秒。`OG_MAX_HTML_BYTES` 设置 HTML 内容上限，单位为字节。默认值和配置示例见 [插件配置](https://kokkoro.js.org/plugin/og#configuration)。

## API

其他插件可以从 `service` 入口导入 `fetchImageUrl()`，获取网页声明的 Open Graph 预览图片地址：

```typescript
import { fetchImageUrl } from 'kokkoro-plugin-og/service';

const imageUrl = await fetchImageUrl('https://ogp.me/');
```

参数、解析规则和错误行为见 [插件 API 文档](https://kokkoro.js.org/plugin/og#api)。
