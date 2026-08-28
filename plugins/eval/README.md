# kokkoro-plugin-eval

在聊天中执行 JavaScript 或 TypeScript 代码。

## 安装

```shell
bun add kokkoro-plugin-eval
```

## 指令

```text
/执行 <parts>...
```

`parts` 表示需要执行的代码。发送指令后，插件会返回执行结果。

```text
/执行 1 + 1
```

## 快捷方式

也可以使用「>」快捷执行：

```text
> await fetch('https://example.com').then(response => response.status)
```

群聊需要开启「获取群内全部消息」权限。

代码执行超过 1 分钟或输出超过 64 KB 时会被终止。

## 安全

该插件允许聊天用户以与 Kokkoro 进程相同的系统权限执行任意 JavaScript 或 TypeScript 代码。仅在机器人只接受可信用户消息时安装该插件。
