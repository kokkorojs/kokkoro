# 数据库

::: warning TODO
不定期更新
:::

## API

基于 [LevelDB](https://leveljs.org/) 开发的本地数据库，API 十分简洁易上手，与 [classic-level](https://www.npmjs.com/package/classic-level) 保持一致，并新增 `has` 方法。

```javascript
import { Database } from '@kokkoro/database';

const db = new Database('example');

await db.put('message', 'hello world');
await db.get('message');
await db.del('message');
await db.has('message');
```

在实例化 `Database` 类后，将会在 `/data/database` 目录中创建本地文件。
