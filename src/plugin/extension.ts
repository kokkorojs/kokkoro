import { parentPort } from 'worker_threads';

import { VERSION } from '@/kokkoro';
import { Plugin, retrievalPlugins } from '@/plugin';
// import { disablePlugin } from '@/worker';

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
  .limit(5)
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

//#region 插件
plugin
  .command('plugin')
  .description('插件模块列表')
  .sugar(/^(插件)$/)
  .action(async (ctx) => {
    const plugins = await retrievalPlugins();
    const list: {
      node_modules: string[];
      plugins: string[];
    } = {
      node_modules: [],
      plugins: [],
    };
    const plugins_length = plugins.length;

    for (let i = 0; i < plugins_length; i++) {
      const plugin = plugins[i];
      const { name, local } = plugin;

      local ? list.plugins.push(name) : list.node_modules.push(name);
    }
    ctx.reply(JSON.stringify(list, null, 2));
  });
//#endregion

//#region 重载
// plugin
//   .command('reload <name>')
//   .description('重载插件')
//   .limit(5)
//   .sugar(/^(重载)\s?(?<name>([a-z]|\s)+)$/)
//   .action(async (ctx) => {
//     const { name } = ctx.query;

//   });
//#endregion

//#region 禁用
plugin
  .command('disable <name>')
  .description('禁用插件')
  .limit(5)
  .sugar(/^(禁用)\s?(?<name>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { name } = ctx.query;

    // TODO ⎛⎝≥⏝⏝≤⎛⎝
    const error: any = await ctx.botApi('disablePlugin', name);

    if (!error) {
      ctx.reply(`已将 ${name} 添加至禁用列表`);
    } else {
      ctx.reply(error);
    }
  });
//#endregion
