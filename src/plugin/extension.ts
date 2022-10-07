import { Plugin } from '.';
import { VERSION } from '..';

const plugin = new Plugin().version(VERSION);

//#region 打印
plugin
  .command('print <message>')
  .description('打印输出信息，一般用作测试')
  .sugar(/^(打印|输出)\s?(?<message>.+)$/)
  .action((event) => {
    // event.reply(event.query.message);
  });
//#endregion
