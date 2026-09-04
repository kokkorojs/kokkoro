# kokkoro-plugin-kfc

肯德基网络梗，随机获取一条疯狂星期四文案。

## 安装

```shell
bun add kokkoro-plugin-kfc
```

## 指令

```text
/疯狂星期四
```

发送「/疯狂星期四」，插件会随机返回一条疯狂星期四文案。

## 快捷方式

消息中包含以下任意一类关键词时，插件也会随机返回一条疯狂星期四文案。

- 付款梗，例如「V我50」、「微我五十」或「vivo50」
- 肯德基，例如「肯德基」或「KFC」
- 星期四，例如「周四」、「星期四」、「木曜日」或「Thursday」

北京时间每周四，消息中出现「麦当劳」、「金拱门」、「华莱士」、「汉堡王」、「德克士」或「塔斯汀」时，也会随机返回一条疯狂星期四文案。

> [!WARNING]
> 快捷方式会在整段消息中查找关键词，因此链接地址中包含 `v50` 或 `kfc` 时也可能触发插件。该问题将在后续版本中优化。

群聊需要开启「获取群内全部消息」权限。

## API

其他插件可以从 `service` 入口导入 `fetchCrazyThursday()`。该函数返回疯狂星期四接口的完整响应：

```typescript
import { fetchCrazyThursday } from 'kokkoro-plugin-kfc/service';

const result = await fetchCrazyThursday();
```
