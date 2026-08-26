# 插件社区

::: tip
本页收录 Kokkoro 历代提供过的插件与功能。它们既包括面向 v1、v2 发布的社区插件，也包括更早期且从未发布到 npm 的功能。目前所有内容均未适配 v3，可以把这个页面视为历史功能展示和后续适配清单。

若有你比较中意的功能，可以在群里催更或者提交 Issue。
:::

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

## 一言语句

::: warning
该插件的最后一个版本适用于 Kokkoro v2，尚未适配 v3。
:::

```shell
bun add kokkoro-plugin-hitokoto
```

### 来句骚话

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">/来点骚话</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <span>『不对失误耿耿于怀，而是专心为今后做打算，这才是最有效率的』</span>
    <br />
    <div style="text-align: right;">—— 间谍过家家</div>
  </ChatMessage>
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

## SauceNAO 图片搜索

::: warning
该插件的最后一个版本适用于 Kokkoro v1，尚未适配后续版本。
:::

```shell
bun add kokkoro-plugin-saucenao
```

### 搜图

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">搜图</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">请发送你要搜索的图片 (●'◡'●)</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">
    <img width="200" src="/74237509.jpg" />
  </ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <div>平台：Pixiv</div>
    <div>封面：</div>
    <img width="100" src="/74237509.jpg" />
    <div>相似：98.3%</div>
    <div>地址：<a style="color: dodgerblue;">https://www.pixiv.net/artworks/74237509</a></div>
  </ChatMessage>
</ChatPanel>

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

## 沙盒

::: warning
该插件来自 Kokkoro 早期版本，尚未适配 v3。
:::

可执行任意 js 代码段，包括 bot api 和发送网络请求，有着极高的可玩性，你可以把这个插件当做浏览器的 f12 去实现各种有意思的东西

### 执行运算符

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">>1000 - 7</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">993</ChatMessage>
</ChatPanel>

### 创建变量

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">>const 贴贴 = "不要贴贴，贴贴危险，还会密接"</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">true</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">贴贴</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">不要贴贴，贴贴危险，还会密接</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">>delete 贴贴</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">true</ChatMessage>
</ChatPanel>

你可以通过创建变量实现类似及时问答的效果，不过更推荐通过 [qa](/plugin/community#你问我答) 插件去定义，毕竟单纯地变量不支持正则

### 执行脚本

<ChatPanel>
  <ChatMessage qq="2225151531" nickname="Yuki">
  {{
    [
      '>for (let i = 0; i &lt 3; i++) {',
      "  context.reply('重要的事情说三遍！');",
      '}',
    ].join('\n')
  }}
  </ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">重要的事情说三遍！</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">重要的事情说三遍！</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">重要的事情说三遍！</ChatMessage>
</ChatPanel>

我并未对执行语句做过滤，给大家提供较高的自由度并不代表可以做一些危险的举动，包括但不限于 `process.exit()`、`const exec = require('child_process')`、`while(true) {}`...

上述行为一经发现将永久拉入黑名单

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
