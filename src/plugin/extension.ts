import { Plugin } from '@/plugin';
import { VERSION } from '@/kokkoro';

const plugin = new Plugin().version(VERSION);

//#region 打印
plugin
  .command('print <message>')
  .description('打印输出信息，一般用作测试')
  // .sugar(/^(打印|输出)\s?(?<message>.+)$/)
  .action((ctx) => {
    console.log(ctx);
    // ctx.reply(event.query.message);
  });
//#endregion
