# 旧版插件 {#legacy-plugins}

Kokkoro v1、v2 及更早版本曾提供以下插件和功能，它们尚未适配 Kokkoro v3。本页保留不同历史阶段的功能演示，指令格式和回复内容以当时的版本为准。当前由官方维护的插件见 [官方插件](/plugin/official)，其他插件可以在 [插件市场](/plugin/market) 中查找。

## 一言定时推送 {#hitokoto-scheduled-message}

旧版一言插件可以在每天凌晨向群聊发送一条网抑云文案。QQ 官方 API 不提供获取机器人已加入群聊列表的接口，因此这个功能尚未在 Kokkoro v3 中恢复。

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2854205915" nickname="可可萝">失恋的时候，许多年轻人以为整个世界都抛弃了自己，别傻了，世界根本就没需要过你。</ChatMessage>
</ChatPanel>

## ChatGPT {#chatgpt}

该插件来自 Kokkoro v1。

**旧版包名**：`kokkoro-plugin-chatgpt`

### 咨询 {#chatgpt-query}

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">咨询 怎么做光刻机？</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <div>光刻机操作很简单，大致可以分为几个步骤：</div>
    <div>1. 准备好要刻的图像。</div>
    <div>2. 把图像通过光刻机传输到腐蚀液中。</div>
    <div>3. 将腐蚀液加热或用化学物质处理，使其变成图像。</div>
    <div>4. 通过检查图像，确保它的质量。</div>
    <div>5. 使用干燥剂将图像固定在一个特定的位置上。</div>
    <div>6. 最后，将硬件放置在指定的位置上，就可以完成制作工作了。</div>
  </ChatMessage>
</ChatPanel>

这……很简单吗？

## 切噜语 {#cherugo}

该插件来自 Kokkoro v1。

**旧版包名**：`kokkoro-plugin-cherugo`

与「熊说」、「佛曰」类似，该插件可以在普通文本与切噜语之间转换。

### 加密 {#cherugo-encrypt}

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">切噜一下 会长我挂树了</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">切噜～♪切噼噼卟蹦咧噼哔噜蹦巴叮拉嘭噼叮拉噜巴啰铃卟巴噼巴</ChatMessage>
</ChatPanel>

### 解密 {#cherugo-decrypt}

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">切噜～♪切噼噼卟蹦咧噼哔噜蹦巴叮拉嘭噼叮拉噜巴啰铃卟巴噼巴</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">会长我挂树了</ChatMessage>
</ChatPanel>

## 群管理 {#group-management}

该插件来自 Kokkoro v1。

**旧版包名**：`kokkoro-plugin-group`

### 申请头衔 {#group-title}

::: warning
该功能依赖第三方 QQ 协议。QQ 官方机器人目前不支持设置群头衔，因此无法在 Kokkoro v3 中实现。
:::

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">申请头衔 咕咕咕</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">申请成功</ChatMessage>
</ChatPanel>

### 入群与退群提示 {#group-join-and-leave}

群成员加入或退出时，插件会自动发送相应提示。

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2854205915" nickname="可可萝">欢迎新人的加入</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">新人已退出群聊</ChatMessage>
</ChatPanel>

## 色图 {#setu}

该插件来自 Kokkoro v1。

**旧版包名**：`kokkoro-plugin-setu`

### 随机色图 {#setu-random}

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">来点色图</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">不可以涩涩！</ChatMessage>
</ChatPanel>

### 指定色图 {#setu-tags}

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">来点萝莉色图</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">不可以涩涩！</ChatMessage>
</ChatPanel>

### 多张色图 {#setu-multiple}

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">来10份色图</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">不可以涩涩！</ChatMessage>
</ChatPanel>

## RSS 订阅 {#rss}

RSS 订阅功能来自 Kokkoro v1。

**旧版包名**：`kokkoro-plugin-rsshub`

## 公主连结 {#pcr}

该插件来自 Kokkoro v2。

**旧版包名**：`kokkoro-plugin-pcr`

Kokkoro 最初为公主连结玩家开发了许多功能。早期版本还曾将这些功能拆分为多个插件：

- **kokkoro-plugin-rank**
- **kokkoro-plugin-battle**
- **kokkoro-plugin-guild**
- **kokkoro-plugin-jjc**
- **kokkoro-plugin-gacha**
- **kokkoro-plugin-dynamic**
- **kokkoro-plugin-web**

### 会战 {#pcr-clan-battle}

<ChatPanel self="2225151531" :bots="['2854205915']">
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

### 十连 {#pcr-gacha}

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">来发十连</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">素敵な仲間が増えますよ~</ChatMessage>
</ChatPanel>

## 空调 {#aircon}

该插件来自 Kokkoro v2。

**旧版包名**：`kokkoro-plugin-aircon`

### 开关 {#aircon-power}

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">开空调</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">哔~❄️当前温度 20°</ChatMessage>
</ChatPanel>

### 温度调节 {#aircon-temperature}

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">设置温度 28</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">哔~☀️当前温度 28°</ChatMessage>
</ChatPanel>

### 温度查询 {#aircon-query}

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">群温度</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">☀️当前温度 28°</ChatMessage>
</ChatPanel>

### 超高温度 {#aircon-high-temperature}

~~群友的第一款人造太阳。~~

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">设置温度 114514</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">哔~🥵当前温度 114514°</ChatMessage>
</ChatPanel>

## 五子棋 {#gomoku}

该功能在 Kokkoro v1 之前的版本中提供，当时没有作为独立的 npm 包发布。

### 开始游戏 {#gomoku-start}

<ChatPanel self="2225151531" :bots="['2854205915']">
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

### 落子 {#gomoku-move}

<ChatPanel self="2225151531" :bots="['2854205915']">
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

## 猜头像 {#avatar-quiz}

该功能在 Kokkoro v1 之前的版本中提供，当时没有作为独立的 npm 包发布。猜头像一直是独立功能，没有合并到公主连结插件中。

<ChatPanel self="2225151531" :bots="['2854205915']">
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

## 人生重开 {#life-restart}

该功能在 Kokkoro v1 之前的版本中提供，当时没有作为独立的 npm 包发布。

### 重开 {#life-restart-start}

<ChatPanel self="2225151531" :bots="['2854205915']">
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

## 你问我答 {#question-answer}

该功能在 Kokkoro v1 之前的版本中提供，当时没有作为独立的 npm 包发布。

### 记录回答 {#record-answer}

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">有人说贴贴你就说不要贴贴，贴贴危险，还会密接</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">好的，我记住了</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">有人说妈你就说崽</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">好的，我记住了</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">有人说<img width="100" src="/images/meme/这河里妈.jpg" />你就说<img width="100" src="/images/meme/这真步河里.jpg" /></ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">好的，我记住了</ChatMessage>
</ChatPanel>

### 自动回答 {#question-answer-reply}

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">贴贴</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">不要贴贴，贴贴危险，还会密接</ChatMessage>
</ChatPanel>

### 查看问题 {#question-answer-list}

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">看看有人问</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">贴贴 | 妈 | <img width="100" src="/images/meme/这河里妈.jpg" /></ChatMessage>
</ChatPanel>

## Galgame {#galgame}

::: danger
该功能始于 2020 年，从未发布到 npm，目前已经停止开发。
:::

### 开始游戏 {#galgame-start}

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">galgame</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <div>序章：翘家</div>
    <br />
    <div>阿伟：“好饿哦……”</div>
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
