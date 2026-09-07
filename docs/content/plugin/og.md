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

单独发送一个 HTTP 或 HTTPS 链接时，插件会自动尝试获取预览图片，链接两侧可以留有空白：

```text
https://ogp.me/
```

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">https://ogp.me/</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <img width="200" src="https://ogp.me/logo.png" />
  </ChatMessage>
</ChatPanel>

自动预览失败时，插件不会回复或记录错误，以免无效链接打断普通聊天。

要让普通群消息触发自动预览，需要开启「获取群内全部消息」权限。

## 配置 {#configuration}

在项目的 `.env` 中设置请求限制，以下为默认值：

```dotenv
OG_TIMEOUT=10000
OG_MAX_HTML_BYTES=1048576
```

- **OG_TIMEOUT**：请求超时时间，单位为毫秒，默认 10 秒。
- **OG_MAX_HTML_BYTES**：解压后的 HTML 内容上限，单位为字节，必须是正的安全整数，默认 1 MiB。

## API {#api}

从 `service` 入口导入 `fetchImageUrl(url: string)`，可以获取网页声明的预览图片地址：

```typescript
import { fetchImageUrl } from 'kokkoro-plugin-og/service';

const imageUrl = await fetchImageUrl('https://ogp.me/');
```

输入必须是 HTTP 或 HTTPS 地址，不能包含用户名或密码。函数按页面顺序读取 `og:image`、`og:image:url` 和 `og:image:secure_url`，返回首个有效地址。HTML 实体会先解码，相对地址以重定向后的网页地址为基准解析。

返回值为 `Promise<string | undefined>`。网页没有有效的 Open Graph 图片或响应不是 HTML 时返回 `undefined`。输入无效、网络请求失败、HTTP 状态码不是 2xx、请求超时或 HTML 内容超过配置上限时，Promise 会 reject。
