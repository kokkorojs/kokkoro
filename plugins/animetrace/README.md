# kokkoro-plugin-animetrace

使用 [AnimeTrace](https://www.animetrace.com/) 识别图片中的动漫、游戏角色及所属作品。

## 安装

```shell
bun add kokkoro-plugin-animetrace
```

发送「/搜角色」时附带图片，插件会识别消息中的第一张图片，并通过 QQ Markdown 展示结果。发送带图的「搜角色」也可以触发识别。

完整使用说明见 [AnimeTrace 角色识别](https://kokkoro.js.org/plugin/animetrace)。

## API

通过 `service` 入口导入 `fetchCharacters()` 获取完整响应，通过 `util` 入口导入 `createMarkdown()` 生成 QQ Markdown：

```typescript
import { fetchCharacters } from 'kokkoro-plugin-animetrace/service';
import { createMarkdown } from 'kokkoro-plugin-animetrace/util';

const { data } = await fetchCharacters('https://kokkoro.js.org/logo.png');
const markdown = createMarkdown(data);
```

`service` 入口同时导出 `ANIMETRACE_API`、`AnimeTrace` 和 `CharacterResult`。参数、响应字段和错误行为见 [插件 API 文档](https://kokkoro.js.org/plugin/animetrace#api)。
