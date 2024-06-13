# kokkoro-plugin-pcr

我不想打公会战.jpg

**Install:**

```shell
npm i kokkoro-plugin-pcr
```

**Usage:**

```javascript
import { mountPlugin } from '@kokkoro/core';

await mountPlugin('kokkoro-plugin-pcr');
```

**Command:**

格式：`/发起会战 <service>`  
场景：群聊 & 频道  
功能：发起当月会战，service 合法值为 [cn | jp | tw]

格式：`/结束会战`  
场景：群聊 & 频道  
功能：主动结束已发起的会战

格式：`/状态`  
场景：群聊 & 频道  
功能：查询当前会战进度

格式：`/报刀 <boss> <damage>`  
场景：群聊 & 频道  
功能：记录出刀信息

格式：`/尾刀 <boss>`  
场景：群聊 & 频道  
功能：斩杀 boss，可以当做是报刀的语法糖，自动将剩余血量追加至 damage

格式：`/撤销`  
场景：群聊 & 频道  
功能：撤销上一次的出刀信息，若跨阶段则无法撤销

格式：`/预约 <boss>`  
场景：群聊 & 频道  
功能：官方机器人暂时无法获取成员信息，目前也无法在群聊 at 用户，暂不可用

格式：`/激爽下班`  
场景：群聊 & 频道  
功能：快速记录剩余出刀信息，damage 默认 0，作用是用于以后的催刀、查刀等功能

格式：`/周目 <lap>`  
场景：群聊 & 频道  
功能：强制跳转至指定周目数，会将所有 boss 状态修改为满血

格式：`/合刀计算 <health> <first> <last>`  
场景：群聊 & 频道  
功能：计算合刀后的补偿时间，health 为 boss 血量
