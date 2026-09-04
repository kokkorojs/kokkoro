# 自定义事件 {#custom-events}

`useEvent()` 监听的是 QQ 推送的 Dispatch 事件。插件也可以通过 `bot.on()` 监听自定义事件，再通过 `bot.emit()` 触发事件，在不同的处理函数之间传递数据。

## 声明事件类型 {#declare-event-types}

自定义事件需要先声明事件名和参数。下面的 `Events` 声明了名为 `notice` 的事件，该事件带有一个字符串参数：

```typescript
interface Events {
  notice: [content: string];
}
```

`Events` 的属性名是事件名，元组则是监听器接收的完整参数列表。将 `Events` 作为 `Bot` 的类型参数后，`bot.on()` 和 `bot.emit()` 就能识别 `notice` 及其参数类型。

## 监听与触发事件 {#listen-and-emit}

通过 `bot.on()` 注册监听器，再通过 `bot.emit()` 触发事件。下面的插件会在 WebSocket 会话准备完成后触发 `notice`，再由 `handleNotice()` 输出通知内容：

```typescript
import { type Bot, useEvent } from '@kokkoro/core';

interface Events {
  notice: [content: string];
}

export default (bot: Bot<Events>) => {
  const handleNotice = (content: string) => {
    console.log(content);
  };

  bot.on('notice', handleNotice);

  useEvent(
    async context => {
      await bot.emit('notice', `机器人 ${context.user.username} 已连接`);
    },
    ['READY'],
  );
};
```

`bot.emit()` 会直接执行该事件的所有监听器，并等待它们执行完成。自定义事件不会重新进入 `Bot` 的中间件链。

监听器抛出错误时，`bot.emit()` 返回的 Promise 会被拒绝。示例通过 `await` 等待结果，因此错误会继续由 Kokkoro 的事件处理流程记录。

在 Hook 之外调用 `bot.emit()` 时，错误不会进入该流程，调用代码需要通过 `try...catch` 处理。日志用法见 [日志与异常](/develop/logging#logging-and-errors)。

## 移除监听器 {#remove-listeners}

通过 `bot.on()` 注册的监听器不属于 Hook，插件取消挂载时不会自动移除。插件可以在 `PluginSetup` 返回的清理函数中调用 `bot.off()`：

```typescript
export default (bot: Bot<Events>) => {
  const handleNotice = (content: string) => {
    console.log(content);
  };

  bot.on('notice', handleNotice);

  return () => {
    bot.off('notice', handleNotice);
  };
};
```

`bot.off()` 必须接收注册时使用的同一个函数引用，因此示例将监听器保存在 `handleNotice` 中。

更多资源清理示例见 [副作用清理](/develop/side-effects)。
