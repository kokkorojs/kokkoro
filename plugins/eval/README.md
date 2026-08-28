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

## 环境变量

`EVAL_TIMEOUT` 和 `EVAL_MAX_BUFFER` 用于自定义插件的执行超时时间和输出上限，单位分别为毫秒和字节。默认值如下：

```ini
EVAL_TIMEOUT=60000
EVAL_MAX_BUFFER=65536
```

## 安全

建议只允许可信用户使用该插件。执行的代码拥有与 Kokkoro 进程相同的系统权限，可以读取文件和环境变量，也可以执行系统命令。
