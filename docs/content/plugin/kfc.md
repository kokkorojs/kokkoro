# 疯狂星期四 {#kfc}

`kokkoro-plugin-kfc` 会随机返回一条疯狂星期四文案。vivo 50。

## 安装 {#installation}

在 Kokkoro 项目目录中安装插件：

```shell
bun add kokkoro-plugin-kfc
```

安装完成后，重新启动项目，Kokkoro 会自动加载插件。

## 使用指令 {#command}

发送 `/疯狂星期四`，插件会随机返回一条文案：

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">/疯狂星期四</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">从前有一个国王叫肯，娶了一个歌姬为妾。国王的国家矿产资源发达，国王十分宠爱歌姬，将一部分矿产给了歌姬的家族开发。但歌姬十分贪婪，为了实现矿产垄断，歌姬把其他同行的矿井都给封了，包括国王分派给贴身武士的。于是国王把歌姬抓起来审判，歌姬问定什么罪？国王说：死罪。肯的姬封矿刑期死，为我武士。</ChatMessage>
</ChatPanel>

## 快捷方式 {#shortcuts}

消息中出现以下任意一类关键词时，也会触发插件：

- **付款梗**：例如「V 我 50」、「微我五十」或「vivo50」。
- **肯德基**：例如「肯德基」或「KFC」。
- **星期四**：例如「周四」、「星期四」、「木曜日」或「Thursday」。

北京时间每周四，消息中出现麦当劳、金拱门、华莱士、汉堡王、德克士或塔斯汀时，也会触发插件。

::: warning 已知问题
快捷方式会在整段消息中查找关键词，因此链接地址中包含 `v50` 或 `kfc` 时也可能触发插件。该问题将在后续版本中优化。
:::

<ChatPanel self="2225151531" :bots="['2854205915']">
  <ChatMessage qq="2225151531" nickname="Yuki">今天星期四，V 我 50</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">
    <span>优秀是“渐渐的事”</span><br />
    <span>成长是“天天的事”</span><br />
    <span>学习是“坚持的事”</span><br />
    <span>别忘了今天是肯德基疯狂星期四</span>
  </ChatMessage>
</ChatPanel>

只有在群聊中开启「获取群内全部消息」权限后，普通群消息才能触发快捷方式。未开启该权限时，需要在消息中 @ 机器人。
