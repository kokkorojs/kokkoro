# AnimeTrace 角色识别 {#animetrace}

`kokkoro-plugin-animetrace` 使用 [AnimeTrace](https://www.animetrace.com/) 识别图片中的动漫、游戏角色及所属作品。

## 安装 {#installation}

在 Kokkoro 项目目录中安装插件：

```shell
bun add kokkoro-plugin-animetrace
```

安装完成后，重新启动项目，Kokkoro 会自动加载插件。插件使用 AnimeTrace 服务端的默认模型。

## 识别角色 {#search-characters}

发送 `/搜角色` 指令时附带图片，或引用包含图片的消息回复该指令。

单次识别仅处理一张图片。检测到多张图片时，插件选取首张图片，并在结果标题下方显示提示：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">
    <span>/搜角色</span>
    <img width="200" src="/74237509.jpg" />
    <img width="200" src="/logo.png" />
  </ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <h3>AnimeTrace 识别结果</h3>
    <blockquote>检测到消息中包含多张图片，已选取首张图片进行识别。</blockquote>
    <blockquote>标有 ＊ 的识别结果可能不准确，请注意甄别。</blockquote>
    <ul><li><strong>＊ コッコロ</strong><br />プリンセスコネクト！Re:Dive</li></ul>
  </ChatMessage>
</ChatPanel>

角色名以粗体显示，所属作品列在下一行。图片包含多个人物时，结果按人物分组。每组候选角色按接口返回的顺序排列，排序越靠前，匹配的可能性越高。角色名和作品名保留接口原文。

置信度较低的结果会标注 `＊`。单个人物的标记显示在各候选角色名前，多个人物的标记显示在对应的人物编号前。

消息中没有图片、接口请求失败或没有识别结果时，机器人会回复错误信息。

## 快捷方式 {#shortcut}

「搜角色」与 `/搜角色` 的用法相同。在普通群消息中使用快捷方式，需要开启「获取群内全部消息」权限。

## 配置 {#configuration}

在项目根目录的 `.env` 中配置每个人物最多显示的候选角色数量：

```ini
ANIMETRACE_LIMIT=3
```

`ANIMETRACE_LIMIT` 必须为正整数，默认值为 `3`。候选角色按接口返回的顺序截取，`fetchCharacters()` 返回完整响应。

修改 `.env` 后，需要重新启动项目。

## API {#api}

`fetchCharacters(url: string, logger?: Logger)` 接收公开可访问的图片 URL，使用默认模型识别角色，返回 `Promise<AnimeTrace>`。每个人物可能对应多个候选角色。HTTP 请求失败、识别状态码不为 `0` 或没有识别到人物时，Promise 会 reject。

```typescript
import { fetchCharacters } from 'kokkoro-plugin-animetrace/service';

const { data, trace_id } = await fetchCharacters('https://kokkoro.js.org/logo.png');
```

第二个参数接受 `@kokkoro/core` 的 `Logger`，在 debug 日志中记录完整请求参数和接口响应。插件通过 `useLogger()` 获取日志记录器后传入。

`AnimeTrace` 包含 `code`、`ai`、`trace_id` 和 `data`。`trace_id` 是本次识别的唯一 ID，反馈问题时使用。`data` 中的每个 `CharacterResult` 包含人物坐标 `box`、检测框 ID `box_id`、`not_confident` 和候选角色列表 `character`。`not_confident` 为 `true` 时，表示置信度较低，候选较多，需人工确认。字段含义见 [AnimeTrace API 文档](https://www.animetrace.com/api-docs/)。

`createMarkdown(results: readonly CharacterResult[], notice?: string)` 从 `kokkoro-plugin-animetrace/util` 导入，将识别结果转换为 QQ Markdown 字符串。每个人物最多显示 `ANIMETRACE_LIMIT` 个候选角色。传入 `notice` 时，提示文字会以引用格式显示在结果标题下方。
