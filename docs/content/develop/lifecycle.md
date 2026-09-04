# 插件生命周期 {#plugin-lifecycle}

只使用 `useCommand()` 和 `useEvent()` 时，Kokkoro 会在取消挂载时自动停用相应的 Hook。插件自行创建数据库连接、定时器等资源时，才需要管理这些资源的生命周期。

Kokkoro 的插件生命周期分为**模块生命周期**和**挂载生命周期**。一个插件模块只会加载一次，但可以同时挂载到多个 `Bot`。

```text
加载插件模块
├── 挂载到 Bot A
├── 挂载到 Bot B
└── 挂载到 Bot C
```

模块顶层适合存放所有 `Bot` 共享的资源。默认导出的 `PluginSetup` 会在每个 `Bot` 挂载插件时分别执行，适合注册只属于当前 `Bot` 的功能。

## 模块生命周期 {#module-lifecycle}

Kokkoro 启动时会导入每个插件一次，并等待模块初始化完成。模块顶层代码在导入时执行，`PluginSetup` 则要等到插件挂载到 `Bot` 时才会执行。

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

模块加载日志只会出现一次。插件挂载到两个 `Bot` 后，`mountCount` 会增加到 2。插件每从一个 `Bot` 取消挂载，`mountCount` 就会减 1。

例如，插件可以在模块顶层连接数据库，让所有 `Bot` 共享该连接。关闭这类共享资源的方法参阅 [副作用清理](/develop/side-effects)。

## 挂载生命周期 {#mount-lifecycle}

插件加载完成后，Kokkoro 会为每个 `Bot` 分别执行 `PluginSetup`。每次执行都会传入当前的 `Bot`，`@kokkoro/core` 会收集本次执行时注册的 Hook。

```typescript
import { useCommand } from '@kokkoro/core';

export default () => {
  let commandCount = 0;

  useCommand('/count', () => {
    commandCount++;

    return `这个机器人已经处理了 ${commandCount} 次 /count`;
  });
};
```

每次执行 `PluginSetup` 都会创建独立的 `commandCount` 和 Hook，因此每个 `Bot` 会分别统计自己处理 `/count` 的次数。

调用 `bot.unmount()` 后，`@kokkoro/core` 会停止接收该插件的新任务，等待正在处理的事件和指令结束，再执行 `PluginSetup` 返回的清理函数。其他 `Bot` 上的挂载不会受到影响。

`PluginSetup` 不能是异步函数，只能返回清理函数或不返回值。如果挂载时需要等待异步初始化，可以通过 `useEvent(async () => {}, [])` 注册初始化任务，`bot.mount()` 会等待该任务完成。

## 生命周期顺序 {#lifecycle-order}

直接使用 Core 管理完整的插件生命周期时，或者 Kokkoro 在启动失败后执行回滚时，插件会按以下顺序完成加载、挂载与释放：

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

应在全部 `Bot` 都取消挂载后，再释放插件模块中的共享资源。运行期间，Kokkoro 不会主动卸载插件。

::: warning 当前限制
通过 Kokkoro CLI 启动项目后，按 **Ctrl+C** 会直接结束进程，不会等待插件的清理函数执行。当前清理机制用于启动失败时的回滚，以及直接使用 Core 时主动调用 `bot.unmount()` 和 `plugin.dispose()` 的场景。
:::

## 启动失败时的回滚 {#startup-rollback}

与加载或挂载相对应的清理步骤称为补偿操作（compensating action）。加载插件模块的补偿操作是释放该模块，挂载插件的补偿操作是取消挂载。

插件模块加载失败时，Kokkoro 会执行已经通过 `useDispose()` 注册的清理函数，记录错误并跳过该插件。

插件挂载到某个 `Bot` 失败时，`@kokkoro/core` 会停用本次注册的 Hook。如果失败发生在 `PluginSetup` 返回清理函数之后，该函数也会执行。Kokkoro 会记录挂载错误，其他 `Bot` 和插件仍可继续启动。

如果 HTTP 服务等后续步骤失败，整个启动流程无法继续，Kokkoro 会按相反顺序执行此前记录的补偿操作。

## 手动管理生命周期 {#manual-lifecycle}

直接使用 `@kokkoro/core` 时，可以通过 `loadPlugin()`、`bot.mount()` 和 `bot.unmount()` 手动管理插件。下面的 `bot` 表示已经创建的 `Bot` 实例：

```typescript
import { loadPlugin } from '@kokkoro/core';

const plugin = await loadPlugin(() => import('./plugins/example'));

await bot.mount(plugin.setup);

await bot.unmount(plugin.setup);
await plugin.dispose();
```

`loadPlugin()` 接收 `() => import()` 形式的 `PluginLoader`，并在插件模块执行完成后返回包含 `setup` 和 `dispose()` 的 `Plugin`。传给 `loadPlugin()` 的参数必须是执行动态导入的函数，不能是路径字符串或 `import()` 返回的 Promise。

`bot.mount()` 和 `bot.unmount()` 使用 `PluginSetup` 的函数引用识别挂载。因此，取消挂载时必须传入同一个 `plugin.setup`。

所有 `Bot` 都取消挂载后，再调用 `plugin.dispose()` 执行通过 `useDispose()` 收集的模块清理函数。

同一时刻只能执行一次 `loadPlugin()`。加载多个插件时，需要等待当前调用完成，再加载下一个。上述生命周期方法调用失败时，`await` 会抛出相应的错误。

不要在同一个 `PluginSetup` 注册的事件或指令回调中等待 `bot.unmount()`。`bot.unmount()` 会等待当前回调结束，而当前回调又在等待 `bot.unmount()`，因此两者会互相等待。需要取消挂载时，先让当前回调结束，再由回调之外的代码调用 `bot.unmount()`。
