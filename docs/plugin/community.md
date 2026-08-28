# 插件社区

::: tip
本页收录 Kokkoro 历代提供过的插件与功能。已经适配 v3 的插件可以直接安装，其他条目会标注适用版本或当前状态。

若有你比较中意的功能，可以在群里催更或者提交 Issue。
:::

## 一言语句

```shell
bun add kokkoro-plugin-hitokoto
```

插件默认返回动画或漫画语句。如需修改默认语句类型，请在项目根目录创建 `.env` 文件，并通过 `HITOKOTO_TYPES` 设置一言接口的 `c` 参数。多个类型使用逗号分隔，默认值为 `a,b`。

```ini
HITOKOTO_TYPES=c,d
```

类型取值参阅[一言接口文档](https://developer.hitokoto.cn/sentence/#请求参数)。修改 `.env` 后需要重新启动项目。

### 随机文本

```text
/一言 [types]...
```

不填写类型时，插件会从一言接口随机返回一条动画或漫画语句。

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">/一言</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">『不对失误耿耿于怀，而是专心为今后做打算，这才是最有效率的』——「间谍过家家」</ChatMessage>
</ChatPanel>

填写类型可以限定本次返回的语句，多个类型使用空格分隔。指令支持动画、漫画、游戏、文学、原创、来自网络、其他、影视、诗词、网易云、哲学和抖机灵。

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">/一言 诗词 文学</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">『人生天地间，忽如远行客。』——「古诗十九首」</ChatMessage>
</ChatPanel>

### 快捷方式

发送「来点骚话」也会随机返回一条语句，群聊需要开启「获取群内全部消息」权限。

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">来点骚话</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">『能哭的地方，只有厕所和爸爸的怀里。』——「CLANNAD」</ChatMessage>
</ChatPanel>

### ~~网抑云~~

::: warning
Kokkoro v3 正在重构，该功能尚未适配。
:::

在每天凌晨自动发送

<ChatPanel>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <span>失恋的时候，许多年轻人以为整个世界都抛弃了自己，别傻了，世界根本就没需要过你。</span>
  </ChatMessage>
</ChatPanel>

## 疯狂星期四

```shell
bun add kokkoro-plugin-kfc
```

```text
/疯狂星期四
```

发送「/疯狂星期四」，插件会随机返回一条疯狂星期四文案。

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">/疯狂星期四</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">从前有一个国王叫肯，娶了一个歌姬为妾。国王的国家矿产资源发达，国王十分宠爱歌姬，将一部分矿产给了歌姬的家族开发。但歌姬十分贪婪，为了实现矿产垄断，歌姬把其他同行的矿井都给封了，包括国王分派给贴身武士的。于是国王把歌姬抓起来审判，歌姬问定什么罪？国王说：死罪。肯的姬封矿刑期死，为我武士。</ChatMessage>
</ChatPanel>

### 快捷方式

消息中包含以下任意一类关键词时，也会随机返回一条疯狂星期四文案。

- 付款梗，例如「V我50」、「微我五十」或「vivo50」
- 肯德基，例如「肯德基」或「KFC」
- 星期四，例如「周四」、「星期四」、「木曜日」或「Thursday」

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">今天星期四，V我50</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <span>优秀是“渐渐的事”</span>
    <br />
    <span>成长是“天天的事”</span>
    <br />
    <span>学习是“坚持的事”</span>
    <br />
    <span>别忘了今天是肯德基疯狂星期四</span>
  </ChatMessage>
</ChatPanel>

北京时间每周四，消息中出现「麦当劳」、「金拱门」、「华莱士」、「汉堡王」、「德克士」或「塔斯汀」时，也会随机返回一条疯狂星期四文案。

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">晚饭去麦当劳</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">我是盗号的 我把这个人的号盗了 但是我看了这个人聊天记录发现他过得非常艰苦 他生活过的一直很烂 我希望有人看见了能帮助他 让他能有钱去吃肯德基疯狂星期四 就这样吧 眼眶都湿润了 我下了</ChatMessage>
</ChatPanel>

群聊使用快捷方式时，需要开启「获取群内全部消息」权限。

## 代码执行

```shell
bun add kokkoro-plugin-eval
```

```text
/执行 <parts>...
```

发送「/执行」并在后面填写 JavaScript 或 TypeScript 代码，插件会返回执行结果。

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">/执行 1 + 1</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">2</ChatMessage>
</ChatPanel>

### 快捷执行

也可以在代码前输入「>」。群聊需要开启「获取群内全部消息」权限。

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">> ((value: number) => value * 2)(21)</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">42</ChatMessage>
</ChatPanel>

### 环境变量

`EVAL_TIMEOUT` 和 `EVAL_MAX_BUFFER` 用于自定义插件的执行超时时间和输出上限，单位分别为毫秒和字节。默认值如下：

```ini
EVAL_TIMEOUT=60000
EVAL_MAX_BUFFER=65536
```

::: danger 安全提示
建议只允许可信用户使用该插件。执行的代码拥有与 Kokkoro 进程相同的系统权限，可以读取文件和环境变量，也可以执行系统命令。
:::

## SauceNAO 图片搜索

```shell
bun add kokkoro-plugin-saucenao
```

使用插件前，需要在项目根目录的 `.env` 文件中填写 [SauceNAO API Key](https://saucenao.com/user.php?page=search-api)。

```ini
SAUCENAO_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SAUCENAO_NUMRES=3
SAUCENAO_SIMILARITY_THRESHOLD=50
```

`SAUCENAO_NUMRES` 表示返回结果数量，默认值为 `3`。

`SAUCENAO_SIMILARITY_THRESHOLD` 表示显示原缩略图的最低相似度，默认值为 `50`。低于该数值时，插件会使用表情包替换缩略图，避免搜出奇怪的图社死。

### 搜图

```text
/搜图
```

发送「/搜图」时附带图片，插件会搜索消息中的第一张图片，并以 Markdown 返回搜索结果，默认显示相似度最高的 3 条。

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">
    <span>/搜图</span>
    <img width="200" src="/74237509.jpg" />
  </ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <h3>SauceNAO 搜图结果</h3>
    <hr />
    <h4>标题</h4>
    <ul>
      <li>猫耳コッコロちゃん</li>
    </ul>
    <h4>平台</h4>
    <ul>
      <li>Pixiv Images</li>
    </ul>
    <h4>相似度</h4>
    <ul>
      <li>98.3%</li>
    </ul>
    <h4>缩略图</h4>
    <img width="200" src="/74237509.jpg" />
    <a style="color: dodgerblue;">查看来源</a>
  </ChatMessage>
</ChatPanel>

### 快捷方式

发送「搜图」时附带图片，也会返回搜索结果。群聊需要开启「获取群内全部消息」权限。

```text
搜图
```

## ChatGPT

::: warning
该插件的最后一个版本适用于 Kokkoro v1，尚未适配后续版本。
:::

```shell
bun add kokkoro-plugin-chatgpt
```

### 咨询

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">咨询 怎么做光刻机？</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
  {{
    [
      '光刻机操作很简单，大致可以分为几个步骤： ',
      '1. 准备好要刻的图像。',
      '2. 把图像通过光刻机传输到腐蚀液中。',
      '3. 将腐蚀液加热或用化学物质处理，使其变成图像。',
      '4. 通过检查图像，确保它的质量。 ',
      '5. 使用干燥剂将图像固定在一个特定的位置上。 ',
      '6. 最后，将硬件放置在指定的位置上，就可以完成制作工作了。',
    ].join('\n')
  }}
  </ChatMessage>
</ChatPanel>

这...很简单么？

### 消息队列

## 切噜语

::: warning
该插件的最后一个版本适用于 Kokkoro v1，尚未适配后续版本。
:::

```shell
bun add kokkoro-plugin-cherugo
```

类似 `熊说`、`佛曰`，可使用切噜语实现文本加密

### 加密

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">切噜一下 会长我挂树了</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">切噜～♪切噼噼卟蹦咧噼哔噜蹦巴叮拉嘭噼叮拉噜巴啰铃卟巴噼巴</ChatMessage>
</ChatPanel>

### 解密

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">切噜～♪切噼噼卟蹦咧噼哔噜蹦巴叮拉嘭噼叮拉噜巴啰铃卟巴噼巴</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">会长我挂树了</ChatMessage>
</ChatPanel>

## 群管理

::: warning
该插件的最后一个版本适用于 Kokkoro v1，尚未适配后续版本。
:::

```shell
bun add kokkoro-plugin-group
```

### 申请头衔

::: warning
该功能依赖第三方 QQ 协议。QQ 官方机器人目前不支持设置群头衔，因此无法在 Kokkoro v3 中实现。
:::

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">申请头衔 咕咕咕</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">申请成功</ChatMessage>
</ChatPanel>

### 欢新提示

在群成员发生变更时发送

<ChatPanel>
  <ChatMessage qq="2854205915" nickname="可可萝">欢迎新人的加入</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">新人已退出群聊</ChatMessage>
</ChatPanel>

## 色图

::: warning
该插件的最后一个版本适用于 Kokkoro v1，尚未适配后续版本。
:::

```shell
bun add kokkoro-plugin-setu
```

### 随机涩图

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">来点色图</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">不可以涩涩！</ChatMessage>
</ChatPanel>

### 指定涩图

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">来点萝莉色图</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">不可以涩涩！</ChatMessage>
</ChatPanel>

### 多张色图

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">来10份色图</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">不可以涩涩！</ChatMessage>
</ChatPanel>

## RSS 订阅

::: warning
该插件来自 Kokkoro v1，目前无法从 npm 安装。
:::

## 公主连结

::: warning
该插件的最后一个版本适用于 Kokkoro v2，尚未适配 v3。
:::

```shell
bun add kokkoro-plugin-pcr
```

kokkoro 最初就是以公主连结玩家为核心开发相关功能的，现在计划将一系列插件整合

- kokkoro-plugin-rank
- kokkoro-plugin-battle
- kokkoro-plugin-guild
- kokkoro-plugin-jjc
- kokkoro-plugin-gacha
- kokkoro-plugin-dynamic
- kokkoro-plugin-web

上列插件月底将全部废弃，并正式更名为 kokkoro-plugin-pcr

### 会战

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">开启会战</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <div>当前状态:</div>
    <div>&emsp;1 周目 1 阶段 1 王</div>
    <div>boss 信息:</div>
    <div>&emsp;6000000 / 6000000</div>
    <div>更新时间:</div>
    <div>&emsp;2022/09/29 22:32:30</div>
  </ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">尾刀</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <div>当前状态:</div>
    <div>&emsp;1 周目 1 阶段 2 王</div>
    <div>boss 信息:</div>
    <div>&emsp;8000000 / 8000000</div>
    <div>更新时间:</div>
    <div>&emsp;2022/09/29 22:35:30</div>
  </ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">预约 5</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">预约成功</ChatMessage>
</ChatPanel>

### 十连

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">来发十连</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">素敵な仲間が増えますよ~</ChatMessage>
</ChatPanel>

### 竞技场

### 买药

### Rank

### 日程推送

## 空调

::: warning
该插件的最后一个版本适用于 Kokkoro v2，尚未适配 v3。
:::

```shell
bun add kokkoro-plugin-aircon
```

### 开关

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">开空调</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">哔~❄️当前温度 20°</ChatMessage>
</ChatPanel>

### 温度调节

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">设置温度 28</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">哔~☀️当前温度 28°</ChatMessage>
</ChatPanel>

### 温度查询

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">群温度</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">☀️当前温度 28°</ChatMessage>
</ChatPanel>

### ~~群友的第一款人造太阳~~

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">设置温度 114514</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">哔~🥵当前温度 114514°</ChatMessage>
</ChatPanel>

## 五子棋

::: warning 早期功能
以下功能来自 Kokkoro v1 以前的版本，当时没有作为独立的 npm 包发布，目前也尚未适配 v3。
:::

### 开始游戏

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">五子棋</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <div>&ensp;&ensp;①&ensp;②&ensp;③&ensp;④&ensp;⑤&ensp;⑥&ensp;⑦&ensp;⑧</div>
    <div>Ａ┌,┬,┬,┬,┬,┬,┬,┬,┬,┬,┬,┐</div>
    <div>Ｂ├,┼,┼,┼,┼,┼,┼,┼,┼,┼,┼,┤</div>
    <div>Ｃ├,┼,┼,┼,┼,┼,┼,┼,┼,┼,┼,┤</div>
    <div>Ｄ├,┼,┼,┼,┼,┼,┼,┼,┼,┼,┼,┤</div>
    <div>Ｅ├,┼,┼,┼,┼,┼,┼,┼,┼,┼,┼,┤</div>
    <div>Ｆ├,┼,┼,┼,┼,┼,┼,┼,┼,┼,┼,┤</div>
    <div>Ｇ├,┼,┼,┼,┼,┼,┼,┼,┼,┼,┼,┤</div>
    <div>Ｈ└,┴,┴,┴,┴,┴,┴,┴,┴,┴,┴,┘</div>
  </ChatMessage>
</ChatPanel>

### 落子

  <ChatPanel>
    <ChatMessage qq="2225151531" nickname="Yuki">落子 d4</ChatMessage>
    <ChatMessage qq="2854205915" nickname="可可萝">
      <div>&ensp;&ensp;①&ensp;②&ensp;③&ensp;④&ensp;⑤&ensp;⑥&ensp;⑦&ensp;⑧</div>
      <div>Ａ┌,┬,┬,┬,┬,┬,┬,┬,┬,┬,┬,┐</div>
      <div>Ｂ├,┼,┼,┼,┼,┼,┼,┼,┼,┼,┼,┤</div>
      <div>Ｃ├,┼,┼,┼,┼,┼,┼,┼,┼,┼,┼,┤</div>
      <div>Ｄ├,┼,┼,┼,┼,●,┼,┼,┼,┼,┼,┤</div>
      <div>Ｅ├,┼,┼,┼,┼,┼,┼,┼,┼,┼,┼,┤</div>
      <div>Ｆ├,┼,┼,┼,┼,┼,┼,┼,┼,┼,┼,┤</div>
      <div>Ｇ├,┼,┼,┼,┼,┼,┼,┼,┼,┼,┼,┤</div>
      <div>Ｈ└,┴,┴,┴,┴,┴,┴,┴,┴,┴,┴,┘</div>
    </ChatMessage>
  </ChatPanel>

## 猜头像

本来是计划把猜头像也整合进 pcr 插件，考虑到后续可能会添加其它游戏类型的头像，所以仍然独立。

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">猜头像</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <img src="/ranfa.png" />
  </ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">麻麻</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <img src="/118111.webp" />
    <div>恭喜 yuki 猜对啦~</div>
    <div>关键字： 兰法、妈、妈妈、麻麻、兰法妈妈、兰法麻麻</div>
  </ChatMessage>
</ChatPanel>

## 人生重开

### 重开

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">重开</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <div>请选取 3 个天赋：</div>
    <div>&emsp;1. 城中高楼（你出生在城市）</div>
    <div>&emsp;2. 驻颜（体质>10时颜值+3）</div>
    <div>&emsp;3. 班中红人（和同学容易处好关系）</div>
    <div>&emsp;4. 橙色转盘（变成随机橙色天赋）</div>
    <div>&emsp;5. 三胎人生（你尽可能生三胎）</div>
    <div>&emsp;6. 独生子女（你没有兄弟姐妹）</div>
    <div>&emsp;7. 贪婪（家境+10）</div>
    <div>&emsp;8. 把握不住（你有强迫症）</div>
    <div>&emsp;9. 学前启蒙（5岁时智力+2）</div>
    <div>&emsp;10. 保胎丸（你不会胎死腹中）</div>
  </ChatMessage>
</ChatPanel>

## 你问我答

### 问

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">有人说贴贴你就说不要贴贴，贴贴危险，还会密接</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">好的，我记住了</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">有人说妈你就说崽</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">好的，我记住了</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">有人说<img width="100" src="/images/meme/这河里妈.jpg" />你就说<img width="100" src="/images/meme/这真步河里.jpg" /></ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">好的，我记住了</ChatMessage>
</ChatPanel>

### 答

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">贴贴</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">不要贴贴，贴贴危险，还会密接</ChatMessage>
</ChatPanel>

### 查

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">看看有人问</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">贴贴 | 妈 | <img width="100" src="/images/meme/这河里妈.jpg" /></ChatMessage>
</ChatPanel>

## Galgame

::: danger
该功能始于 2020 年，从未发布到 npm，目前已经停止开发。
:::

### 开始

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">galgame</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <div>序章：翘家</div>
    <br />
    <div>阿伟：“好饿哦...”</div>
    <div>阿伟和彬彬刚走出网吧，就开始抱怨</div>
    <div>彬彬：“我们都没钱，没钱我们就只能回家”</div>
    <div>？？：诶，你们好</div>
    <div>？？：这里有一个面包，我还不饿，你们吃不吃？</div>
    <div>————————————————————</div>
    <div>A 吃</div>
    <div>B 不吃不行</div>
    <div>C 没办法，还是吃吧</div>
  </ChatMessage>
</ChatPanel>

### 存档

### 载入
