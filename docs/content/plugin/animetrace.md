# AnimeTrace 角色识别 {#animetrace}

`kokkoro-plugin-animetrace` 使用 [AnimeTrace](https://www.animetrace.com/) 识别图片中的动漫、游戏角色及所属作品。

## 安装 {#installation}

在 Kokkoro 项目目录中安装插件：

```shell
bun add kokkoro-plugin-animetrace
```

安装完成后，重新启动项目，Kokkoro 会自动加载插件。插件使用 AnimeTrace 服务端的默认模型。

## 识别角色 {#search-characters}

发送带有图片的 `/搜角色` 指令，插件会识别消息中的第一张图片。以下示例包含低置信度识别结果：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">
    <span>/搜角色</span>
    <img width="200" src="/74237509.jpg" />
  </ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <h3>AnimeTrace 搜索结果</h3>
    <blockquote>带 ＊ 的人物可能识别不准确。</blockquote>
    <ul><li><strong>＊ コッコロ</strong><br />プリンセスコネクト！Re:Dive</li></ul>
  </ChatMessage>
</ChatPanel>

候选角色名加粗显示，下一行显示所属作品。检测到多个人物时，按人物编号分组。每组候选角色保持接口返回的顺序，越靠前可能性越大。角色和作品名称保留接口原文。

接口返回低置信度识别结果时，插件会标注 `＊`，并在消息标题下方统一说明符号的含义。单个人物时，符号显示在各候选角色名前。多个人物时，符号显示在对应人物编号前。

消息中没有图片、接口请求失败或没有识别结果时，机器人会回复错误信息。

## 快捷方式 {#shortcut}

发送带有图片的「搜角色」消息，也会执行相同的识别。要让普通群消息触发快捷方式，需要开启「获取群内全部消息」权限。

## 配置 {#configuration}

在项目根目录的 `.env` 中设置每个人物展示的候选角色数量上限：

```ini
ANIMETRACE_LIMIT=3
```

`ANIMETRACE_LIMIT` 必须为正整数，默认值为 `3`。候选角色按接口返回的顺序截取，`fetchCharacters()` 返回完整响应。

修改 `.env` 后，需要重新启动项目。

## API {#api}

`fetchCharacters(url: string, logger?: Logger)` 从公开可访问的图片 URL 获取识别结果，返回 `Promise<AnimeTrace>`。请求使用默认模型，返回多个候选结果。HTTP 请求失败、识别状态码不为 `0` 或人物结果为空时，Promise 会 reject。

```typescript
import { fetchCharacters } from 'kokkoro-plugin-animetrace/service';

const { data, trace_id } = await fetchCharacters('https://kokkoro.js.org/logo.png');
```

第二个参数接受 `@kokkoro/core` 的 `Logger`，在 debug 日志中记录完整请求参数和接口响应。插件通过 `useLogger()` 获取日志记录器后传入。

`AnimeTrace` 包含 `code`、`ai`、`trace_id` 和 `data`。`trace_id` 是本次识别的唯一 ID，反馈问题时使用。`data` 中的每个 `CharacterResult` 包含人物坐标 `box`、检测框 ID `box_id`、`not_confident` 和候选角色列表 `character`。`not_confident` 为 `true` 时，表示置信度较低，候选较多，需人工确认。字段含义见 [AnimeTrace API 文档](https://www.animetrace.com/api-docs/)。

`createMarkdown(results: readonly CharacterResult[])` 从 `kokkoro-plugin-animetrace/util` 导入，按 `ANIMETRACE_LIMIT` 限制每个人物展示的候选角色数量，并生成 QQ Markdown 字符串。
