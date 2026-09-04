# 旧版插件权限 {#legacy-plugin-permissions}

::: warning
Kokkoro v3 尚未实现插件权限，本页记录旧版功能，帮助理解多机器人项目如何分别控制插件。下列配置均不适用于 Kokkoro v3。
:::

一个项目可以运行多个机器人，每个机器人需要的插件却未必相同。Kokkoro v1 和 v2 都提供过限制插件使用范围的能力，但两代版本采用的配置模型不同。

## Kokkoro v1 {#kokkoro-v1}

Kokkoro v1 会为每个机器人生成独立的 `profile-<QQ号>.json`。插件可以针对当前机器人完全禁用，也可以只在某个群聊中关闭。

下面的 profile 表示 `kfc` 在当前机器人中完全禁用，`hitokoto` 则只在群聊 `123456789` 中关闭：

```json
{
  "group": {
    "123456789": {
      "name": "测试群",
      "setting": {
        "hitokoto": {
          "apply": false,
          "lock": false
        }
      }
    }
  },
  "disable": ["kfc"]
}
```

顶层的 `disable` 记录当前机器人禁用的插件。`group.<群号>.setting.<插件>.apply` 则记录插件是否在指定群聊中启用。

v1 内置的 `enable` 和 `disable` 指令用于修改机器人的全局禁用列表，`apply` 和 `exempt` 则用于切换当前群聊的插件开关。这些配置保存在 profile 中，而不是 `kokkoro.json` 的机器人对象中。

## Kokkoro v2 {#kokkoro-v2}

Kokkoro v2 改为在机器人配置中使用 `plugins` 数组。下面的配置让第一个机器人使用 `hitokoto` 和 `kfc`，第二个机器人只使用 `hitokoto`：

```json
{
  "bots": [
    {
      "appid": "FIRST_APP_ID",
      "token": "FIRST_TOKEN",
      "secret": "FIRST_SECRET",
      "plugins": ["hitokoto", "kfc"]
    },
    {
      "appid": "SECOND_APP_ID",
      "token": "SECOND_TOKEN",
      "secret": "SECOND_SECRET",
      "plugins": ["hitokoto"]
    }
  ]
}
```

数组中的值对应旧版插件的 `metadata.name`。省略 `plugins` 或传入空数组时，机器人会挂载全部插件。

按照上面的配置，可可萝能够响应一言和疯狂星期四指令，爱梅斯只会响应一言：

<ChatPanel self="2225151531" :bots="['2854205915', '2854211958']">
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /一言</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">『只有分离后才能懂的事，却没有了感慨的时间。』——「宝石之国」</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">@爱梅斯 /一言</ChatMessage>
  <ChatMessage qq="2854211958" nickname="爱梅斯">『只要努力活下去，总有一天会笑着回忆。』——「不可思议游戏」</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">@可可萝 /疯狂星期四</ChatMessage>
  <ChatMessage qq="2854205915" nickname="可可萝">Steam 上多买了一个艾尔登法环的 key，送给有缘人了：KFCC-RAZY-THUR-SDAY-VME50</ChatMessage>
  <ChatMessage qq="2225151531" nickname="Yuki">@爱梅斯 /疯狂星期四</ChatMessage>
</ChatPanel>

## Kokkoro v3 {#kokkoro-v3}

Kokkoro v3 会在启动时尝试将全部插件挂载到每个机器人。新的权限模型仍在设计，未来的配置形式不一定沿用 v1 或 v2。
