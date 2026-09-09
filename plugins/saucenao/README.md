# kokkoro-plugin-saucenao

SauceNAO 图片搜索，查找动漫、漫画、插画等图片的来源。

> [!IMPORTANT]
> 使用 SauceNAO API 前，需要先[申请 API Key](https://saucenao.com/user.php?page=search-api)，并完成[环境变量配置](#环境变量)。

## 安装

```shell
bun add kokkoro-plugin-saucenao
```

## 指令

```text
/搜图
```

发送「/搜图」指令时附带图片，或引用包含图片的消息回复该指令。插件搜索首张图片的来源，并通过 QQ Markdown 返回结果，默认显示相似度最高的 3 条。

## 快捷方式

「搜图」与「/搜图」的用法相同。在普通群消息中使用快捷方式，需要开启「获取群内全部消息」权限。

```text
搜图
```

## API

其他插件可以从 `service` 入口导入 `fetchImageSources()` 搜索图片来源，再从 `util` 入口导入 `createMarkdown()` 生成 QQ Markdown：

```typescript
import { fetchImageSources } from 'kokkoro-plugin-saucenao/service';
import { createMarkdown } from 'kokkoro-plugin-saucenao/util';

const { results } = await fetchImageSources('https://example.com/image.jpg');
const markdown = await createMarkdown(results);
```

`fetchImageSources()` 返回 SauceNAO 的完整响应，可通过第二个参数传入日志记录器，记录完整请求参数和接口响应。`service` 入口同时导出 `SauceNao` 和 `ImageSource` 类型。

## 环境变量

使用插件前，需要在项目根目录的 `.env` 文件中填写 [SauceNAO API Key](https://saucenao.com/user.php?page=search-api)。

```ini
SAUCENAO_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SAUCENAO_NUMRES=3
SAUCENAO_SIMILARITY_THRESHOLD=50
```

`SAUCENAO_NUMRES` 表示返回结果数量，默认值为 `3`。

`SAUCENAO_SIMILARITY_THRESHOLD` 表示显示原缩略图的最低相似度，默认值为 `50`。低于该数值时，插件会使用表情包替换缩略图，避免搜出奇怪的图社死。
