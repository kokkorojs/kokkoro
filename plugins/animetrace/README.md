# kokkoro-plugin-animetrace

使用 [AnimeTrace](https://www.animetrace.com/) 识别图片中的动漫、游戏角色及所属作品。

## 安装

```shell
bun add kokkoro-plugin-animetrace
```

发送「/搜角色」指令时附带图片，或引用包含图片的消息回复该指令。插件识别首张图片中的角色，并通过 QQ Markdown 返回结果。「搜角色」与「/搜角色」的用法相同。

完整使用说明见 [AnimeTrace 角色识别](https://kokkoro.js.org/plugin/animetrace)。

## 环境变量

在项目根目录的 `.env` 中配置每个人物最多显示的候选角色数量：

```ini
ANIMETRACE_LIMIT=3
```

`ANIMETRACE_LIMIT` 必须为正整数，默认值为 `3`。

## API

通过 `service` 入口导入 `fetchCharacters()` 获取完整响应，通过 `util` 入口导入 `createMarkdown()` 生成 QQ Markdown：

```typescript
import { fetchCharacters } from 'kokkoro-plugin-animetrace/service';
import { createMarkdown } from 'kokkoro-plugin-animetrace/util';

const { data } = await fetchCharacters('https://kokkoro.js.org/logo.png');
const markdown = createMarkdown(data);
```

`fetchCharacters()` 的第二个参数可传入日志记录器，记录完整请求参数和接口响应。

`service` 入口同时导出 `ANIMETRACE_API`、`AnimeTrace` 和 `CharacterResult`。参数、响应字段和错误行为见 [插件 API 文档](https://kokkoro.js.org/plugin/animetrace#api)。
