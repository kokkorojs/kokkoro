# AnimeTrace 角色识别 {#animetrace}

`kokkoro-plugin-animetrace` 使用 [AnimeTrace](https://www.animetrace.com/) 识别图片中的动漫、游戏角色及所属作品。

## 安装 {#installation}

在 Kokkoro 项目目录中安装插件：

```shell
bun add kokkoro-plugin-animetrace
```

安装完成后，重新启动项目，Kokkoro 会自动加载插件。插件无需 API Key 或环境变量，使用 AnimeTrace 服务端的默认模型。

## 识别角色 {#search-characters}

发送带有图片的 `/搜角色` 指令，插件会识别消息中的第一张图片。以下为结果展示示例：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">
    <span>/搜角色</span>
    <img width="200" src="/74237509.jpg" />
  </ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <h3>AnimeTrace 搜索结果</h3>
    <ul><li><strong>コッコロ</strong><br />プリンセスコネクト！Re:Dive</li></ul>
  </ChatMessage>
</ChatPanel>

一张图片包含多个人物时，结果按人物分组，每组候选角色保持接口返回的顺序，越靠前可能性越大。角色和作品名称保留接口原文。

接口标记置信度较低时，对应人物的候选列表下方会显示确认提示。

消息中没有图片、接口请求失败或没有识别结果时，机器人会回复错误信息。

## 快捷方式 {#shortcut}

发送带有图片的「搜角色」消息，也会执行相同的识别。要让普通群消息触发快捷方式，需要开启「获取群内全部消息」权限。

## API {#api}

`fetchCharacters(image: string)` 从公开可访问的图片 URL 获取识别结果，返回 `Promise<AnimeTrace>`。请求使用默认模型，返回多个候选结果。HTTP 请求失败、识别状态码不为 `0` 或人物结果为空时，Promise 会 reject。

```typescript
import { fetchCharacters } from 'kokkoro-plugin-animetrace/service';

const { data, trace_id } = await fetchCharacters('https://kokkoro.js.org/logo.png');
```

`AnimeTrace` 包含 `code`、`ai`、`trace_id` 和 `data`。`data` 中的每个 `CharacterResult` 包含人物坐标 `box`、检测框 ID `box_id`、低置信度标记 `not_confident` 和候选角色列表 `character`。字段含义见 [AnimeTrace API 文档](https://www.animetrace.com/api-docs/)。

`createMarkdown(results: readonly CharacterResult[])` 从 `kokkoro-plugin-animetrace/util` 导入，将人物识别结果转换为 QQ Markdown 字符串。
