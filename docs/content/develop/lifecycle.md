# 插件生命周期 {#plugin-lifecycle}

Kokkoro 的插件生命周期分为**模块生命周期**和**挂载生命周期**。一个插件模块只会加载一次，但可以同时挂载到多个 `Bot`。

```text
加载插件模块
├── 挂载到 Bot A
├── 挂载到 Bot B
└── 挂载到 Bot C
```

这两层生命周期彼此独立。模块顶层适合存放所有 `Bot` 共享的资源，默认导出的 `PluginSetup` 则负责声明每个 `Bot` 独立运行的功能。

## 模块生命周期 {#module-lifecycle}

Kokkoro 启动时只会导入每个插件一次，并等待模块初始化完成。模块顶层代码只执行一次，`PluginSetup` 则会在插件挂载到 `Bot` 时执行。

```typescript
let mountCount = 0;

console.log('插件模块已加载');

export default () => {
  mountCount++;
  console.log('当前挂载数量', mountCount);

  return () => {
    mountCount--;
    console.log('当前挂载数量', mountCount);
  };
};
```

项目配置两个 `Bot` 时，终端会依次输出：

```text
插件模块已加载
当前挂载数量 1
当前挂载数量 2
```

模块加载日志只会出现一次，每次调用 `bot.unmount()` 取消挂载时，数量都会相应减少。

例如，插件需要连接数据库时，可以在模块顶层建立连接，让所有 `Bot` 共享该连接。如何在插件释放时关闭连接，请参阅 [副作用清理](/develop/side-effects)。

## 挂载生命周期 {#mount-lifecycle}

插件加载完成后，Kokkoro 会将 `PluginSetup` 分别挂载到每个 `Bot`。每次挂载都会重新执行该函数，将当前 `Bot` 作为参数传入，并单独注册 Hook。

```typescript
import { useCommand, useEvent } from '@kokkoro/core';

export default () => {
  let messageCount = 0;

  useEvent(() => {
    messageCount++;
  }, ['C2C_MESSAGE_CREATE', 'GROUP_AT_MESSAGE_CREATE', 'GROUP_MESSAGE_CREATE']);

  useCommand('/count', () => `机器人已收到 ${messageCount} 条消息`);
};
```

每次执行都会创建独立的 `messageCount` 和 Hook，因此每个 `Bot` 会分别统计自己收到的消息。调用 `bot.unmount()` 将插件从当前 `Bot` 取消挂载时，`@kokkoro/core` 会等待正在执行的事件和指令，然后执行 `PluginSetup` 返回的清理函数。其他 `Bot` 的挂载状态不会受到影响。

## 执行顺序 {#order}

插件完整的生命周期如下：

```text
加载插件模块
    ↓
分别挂载到每个 Bot
    ↓
处理事件与指令
    ↓
从每个 Bot 取消挂载
    ↓
释放插件模块
```

Kokkoro 启动时会自动加载并挂载插件。每完成一次加载或挂载，都会记录对应的补偿操作（compensating action），即释放插件或取消挂载。如果启动过程失败，Kokkoro 会按相反顺序执行这些补偿操作。当前版本不会在正常运行时主动卸载插件。手动结束生命周期时，需要先从每个 `Bot` 取消挂载，再释放插件模块。

## 手动管理生命周期 {#manual-lifecycle}

Kokkoro 会自动管理启动阶段的加载、挂载和失败回滚。如果只使用 `@kokkoro/core`，可以通过 `loadPlugin()`、`bot.mount()` 和 `bot.unmount()` 手动管理插件：

```typescript
import { loadPlugin } from '@kokkoro/core';

const plugin = await loadPlugin(() => import('./plugins/example'));

await bot.mount(plugin.setup);

await bot.unmount(plugin.setup);
await plugin.dispose();
```

`loadPlugin()` 接收 `() => import()` 形式的 `PluginLoader`。插件模块执行完成后，它会返回包含 `setup` 和 `dispose()` 的 `Plugin`。该函数不直接接收路径字符串或已经执行的 `import()`。

`bot.mount()` 和 `bot.unmount()` 使用 `PluginSetup` 的函数引用识别挂载。因此，取消挂载时必须传入同一个 `plugin.setup`。

`bot.unmount()` 会等待当前挂载正在处理的事件与指令，再执行 `PluginSetup` 返回的清理函数。所有 `Bot` 都取消挂载后，调用 `plugin.dispose()` 可以执行通过 `useDispose()` 登记的模块清理函数。

加载多个插件时，需要逐个等待 `loadPlugin()` 完成。上述生命周期方法不会静默处理错误，调用失败时，`await` 会直接抛出错误。

不要在同一个 `PluginSetup` 注册的事件或指令回调中等待自身取消挂载。`bot.unmount()` 会等待这些任务执行完成，这样调用会让当前任务等待自己结束。需要由插件触发自身取消挂载时，应交给应用层处理。

::: warning 插件热更新正在重构
当前版本尚不支持插件热更新，也不会主动释放正在运行的插件。未来，在开发模式中检测到本地插件代码变化，或安装、更新社区插件时，Kokkoro 将触发热更新。
:::
