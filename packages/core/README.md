# core

[![package](https://img.shields.io/npm/v/@kokkoro/core?color=57B497&label=@kokkoro/core&style=flat-square&labelColor=FAFAFA&logo=npm)](https://www.npmjs.com/package/@kokkoro/core)
[![engine](https://img.shields.io/node/v/@kokkoro/core?color=339933&style=flat-square&labelColor=FAFAFA&logo=Node.js)](https://nodejs.org)

如果你想快速开发机器人，建议直接使用 [kokkoro](https://github.com/kokkorojs/kokkoro) 框架，该库不包含 web 与 database 等服务。

作为 kokkoro 的核心依赖库，特性与 [amesu](https://github.com/xueelf/amesu) 保持一致，并在此基础上扩展了插件体系。

## Install:

```bash
npm i @kokkoro/core
```

## Usage:

```javascript
import { Bot } from '@kokkoro/core';

/**
 * @type {import('@kokkoro/core').BotConfig}
 */
const config = {};
const bot = new Bot(config);

bot.online();
```

## Plugin:

你可以在根目录创建 `plugins` 文件夹来存放你编写的插件。

```tex
.
├ plugins/
│ └ example/
└ index.js
```

当然，这并不是强制要求，推荐这么做只是为了方便插件的分类与管理。

```javascript
// plugins/example/index.js
import { useCommand, useEvent } from '@kokkoro/core';

/**
 * @type {import('@kokkoro/core').Metadata}
 */
export const metadata = {
  name: 'example',
  description: '插件示例',
};

export default function Example() {
  useEvent(
    ctx => {
      ctx.logger.mark('link start');
    },
    ['session.ready'],
  );

  useCommand('/测试', () => 'hello world');
  useCommand('/复读 <message>', ctx => ctx.query.message);
}
```

只要对插件进行 `mountPlugin` 操作，就可将其挂载：

```javascript
// index.js
import { Bot, mountPlugin } from '@kokkoro/core';

await mountPlugin('./plugins/example/index.js');

/**
 * @type {import('@kokkoro/core').BotConfig}
 */
const config = {};
const bot = new Bot(config);

bot.online();
```

你也可以直接安装 npm 插件来进行使用。

```bash
npm i kokkoro-plugin-hitokoto
```

```javascript
// index.js
import { Bot, mountPlugin } from '@kokkoro/core';

await mountPlugin('./plugins/example/index.js');
await mountPlugin('kokkoro-plugin-hitokoto');

/**
 * @type {import('@kokkoro/core').BotConfig}
 */
const config = {};
const bot = new Bot(config);

bot.online();
```

使用 `mountPlugin` 方法所传入的路径，与 `import` 的规则是保持一致的。不过值得注意的是，kokkoro 是一个 **esm** 模块包，完全遵守 ESModule 规范，而不是 Commonjs。

```javascript
import { mountPlugin } from '@kokkoro/core';

// Good
await mountPlugin('./example.js');
await mountPlugin('example');

// Bad
await mountPlugin('example.js');
await mountPlugin('./example');
await mountPlugin('./plugins/example');
```

## Config:

配置项与 amesu 基本一致，在此基础上添加了 `plugins` 属性，传入字符串数组。

```javascript
import { Bot, mountPlugin } from '@kokkoro/core';

await mountPlugin('./plugins/example/index.js');
await mountPlugin('kokkoro-plugin-hitokoto');

/**
 * @type {import('@kokkoro/core').BotConfig}
 */
const config = {
  // ...
  plugins: ['hitokoto'],
};
const bot = new Bot(config);

bot.online();
```

如果 `plugins` 不传入，则默认所有已挂载的插件会对 bot 生效。如果添加了相应字段，那么只有被添加 name（编写插件时导出的 metadata 属性）的插件才会被实例对象使用。

例如上面的例子，当前 bot 只有 hitokoto 插件被应用，example 插件不会对指令作出响应，这便于多个 bot 实例针对不同插件来管理。
