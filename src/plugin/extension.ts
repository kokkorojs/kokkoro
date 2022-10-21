import { Plugin } from '@/plugin';
import { VERSION } from '@/kokkoro';

const plugin = new Plugin('');

plugin
  .version(VERSION);

//#region 打印
plugin
  .command('print <message>')
  .description('打印输出信息，一般用作测试')
  .sugar(/^(打印|输出)\s?(?<message>.+)$/)
  .action((ctx) => {
    ctx.reply(ctx.query.message);
  });
//#endregion

//#region 状态
plugin
  .command('state')
  .description('查看 bot 运行信息')
  .limit(6)
  .sugar(/^(状态)$/)
  .action(async (ctx) => {
    const resul = await Promise.all([
      ctx.botApi('nickname'),
      ctx.botApi('gl'),
      ctx.botApi('fl'),
      ctx.botApi('stat'),
    ]);
    const [nickname, gl, fl, stat] = resul;
    const group_count = `${gl.size} 个`;
    const friend_count = `${fl.size} 个`;
    const message_min_count = `${stat.msg_cnt_per_min}/分`;
    const state = `${nickname}(${ctx.self_id})
    群　聊：${group_count}
    好　友：${friend_count}
    消息量：${message_min_count}`;

    ctx.reply(state);
  });
//#endregion
