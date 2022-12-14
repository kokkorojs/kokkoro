import { refreshEnv } from '@/config';
import { UPDAY, VERSION } from '@/kokkoro';
import { Plugin, retrievalPluginList, getPluginMap, importPlugin, destroyPlugin } from '@/plugin';

const plugin = new Plugin();

plugin
  .version(VERSION)

//#region 打印
plugin
  .command('print <message>')
  .description('打印测试')
  .sugar(/^(打印|输出)\s?(?<message>.+)$/)
  .action((ctx) => {
    ctx.reply(ctx.query.message);
  });
//#endregion

//#region 环境变量
plugin
  .command('env')
  .description('读取配置文件刷新环境变量')
  .limit(5)
  .sugar(/^(刷新)$/)
  .action(async (ctx) => {
    try {
      refreshEnv();
      ctx.reply('已更新环境变量');
    } catch (error) {
      ctx.reply((<Error>error).message);
    }
  });
//#endregion

//#region 状态
plugin
  .command('state')
  .description('查看 bot 运行信息')
  .sugar(/^(状态)$/)
  .action((ctx) => {
    const { bot } = ctx;
    const { nickname, gl, fl, stat } = bot;

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
    const pluginList = await retrievalPluginList();
    const list: {
      node_modules: string[];
      plugins: string[];
    } = {
      node_modules: [],
      plugins: [],
    };
    const keys = Object.keys(pluginList);
    const keys_length = keys.length;

    for (let i = 0; i < keys_length; i++) {
      const key = keys[i];
      const info = pluginList[key];
      const { folder, local } = info;

      local ? list.plugins.push(folder) : list.node_modules.push(folder);
    }
    ctx.reply(JSON.stringify(list, null, 2));
  });
//#endregion

//#region 挂载
plugin
  .command('mount <name>')
  .description('挂载插件')
  .limit(5)
  .sugar(/^(挂载)\s?(?<name>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { name } = ctx.query;

    await mountPlugin(name);
    await ctx.reply(`插件 ${name} 挂载成功`);
  });
//#endregion

//#region 卸载
plugin
  .command('unmount <name>')
  .description('卸载插件')
  .limit(5)
  .sugar(/^(卸载)\s?(?<name>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { name } = ctx.query;

    await unmountPlugin(name);
    await ctx.reply(`插件 ${name} 已卸载`);
  });
//#endregion

//#region 重载
plugin
  .command('reload <name>')
  .description('重载插件')
  .limit(5)
  .sugar(/^(重载)\s?(?<name>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { name } = ctx.query;

    await unmountPlugin(name);
    await mountPlugin(name);
    await ctx.reply(`插件 ${name} 已重载`);
  });
//#endregion

//#region 启用
plugin
  .command('enable <name>')
  .description('启用插件')
  .limit(4)
  .sugar(/^(启用)\s?(?<name>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { bot, query } = ctx;
    const { name } = query;

    await bot.enablePlugin(name);
    await ctx.reply(`已将 ${name} 从禁用列表移除`);
  });
//#endregion

//#region 禁用
plugin
  .command('disable <name>')
  .description('禁用插件')
  .limit(4)
  .sugar(/^(禁用)\s?(?<name>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { bot, query } = ctx;
    const { name } = query;

    await bot.disablePlugin(name);
    await ctx.reply(`已将 ${name} 添加至禁用列表`);
  });
//#endregion

//#region 群服务
plugin
  .command('server')
  .description('查看当前群服务列表')
  .sugar(/^(服务|群服务|列表)$/)
  .action(async (ctx) => {
    const server: { [key: string]: boolean } = {};
    const { group_id, setting } = ctx;

    if (group_id) {
      const keys = Object.keys(setting!);
      const keys_length = keys.length;

      for (let i = 0; i < keys_length; i++) {
        const name = keys[i];
        const option = setting![name];

        server[name] = option.apply;
      }
      ctx.reply(JSON.stringify(server, null, 2));
    } else {
      ctx.reply(`server 指令仅支持群聊，若要查看本地可用插件，可使用 plugin 指令`);
    }
  });
//#endregion

//#region 应用
plugin
  .command('apply <name>')
  .description('应用群服务')
  .limit(3)
  .sugar(/^(应用)\s?(?<name>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { bot, group_id, query } = ctx;

    if (group_id) {
      const { name } = query;

      try {
        const is_write = await bot.updateOption(group_id, name, 'apply', true);
        ctx.reply(is_write ? `已将 ${name} 群服务应用` : `${name} 已被应用，不要重复修改`);
      } catch (error) {
        ctx.reply((<Error>error).message);
      }
    } else {
      ctx.reply(`apply 指令仅支持群聊，若要为该 bot 启用插件，可使用 enable 指令`);
    }
  });
//#endregion

//#region 免除
plugin
  .command('exempt <name>')
  .description('免除群服务')
  .limit(3)
  .sugar(/^(免除)\s?(?<name>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { bot, group_id, query } = ctx;

    if (group_id) {
      const { name } = query;

      try {
        const is_write = await bot.updateOption(group_id, name, 'apply', false);
        ctx.reply(is_write ? `已将 ${name} 群服务免除` : `${name} 已被免除，不要重复修改`);
      } catch (error) {
        ctx.reply((<Error>error).message);
      }
    } else {
      ctx.reply(`exempt 指令仅支持群聊，若要为该 bot 禁用插件，可使用 disable 指令`);
    }
  });
//#endregion

//#region 帮助
plugin
  .command('help')
  .description('帮助信息')
  .sugar(/^(帮助)$/)
  .action((ctx) => {
    const message = ['Commands: '];
    const commands_length = plugin.commands.length;

    for (let i = 0; i < commands_length; i++) {
      const command = plugin.commands[i];
      const { raw_name, desc } = command;

      message.push(`  ${raw_name}  ${desc}`);
    }
    message.push('\nMore: https://kokkoro.js.org/');
    ctx.reply(message.join('\n'));
  });
//#endregion

//#region 版本
plugin
  .command('version')
  .description('版本信息')
  .sugar(/^(版本|ver)$/)
  .action((ctx) => {
    const version = {
      name: 'kokkoro',
      version: VERSION,
      upday: UPDAY,
      author: 'yuki <mail@yuki.sh>',
      license: 'MIT',
      repository: 'https://github.com/kokkorojs/kokkoro/'
    };
    ctx.reply(JSON.stringify(version, null, 2));
  });
//#endregion

/**
 * 挂载插件
 * 
 * @param name - 插件名
 */
async function mountPlugin(name: string): Promise<void> {
  const pluginMap = getPluginMap();

  if (pluginMap.has(name)) {
    throw new Error(`插件 ${name} 已被挂载`);
  }

  try {
    const pluginList = await retrievalPluginList();
    const info = pluginList[name];

    if (!info) {
      throw new Error(`plugins 与 node_modules 目录均未检索到 "${name}" 和 "kokkoro-plugin-${name}" 插件`);
    }
    const plugin = importPlugin(info);

    plugin.bl.forEach((bot) => {
      bot.emit('bot.profile.refresh');
    });
  } catch (error) {
    throw error;
  }
}

/**
 * 卸载插件
 * 
 * @param name - 插件名
 */
async function unmountPlugin(name: string) {
  const pluginMap = getPluginMap();

  if (!pluginMap.has(name)) {
    throw new Error(`插件 ${name} 未被挂载`);
  }

  try {
    const pluginList = await retrievalPluginList();
    const info = pluginList[name];
    const plugin = pluginMap.get(name)!;

    plugin.emit('plugin.destroy');
    destroyPlugin(info);
  } catch (error) {
    throw error;
  }
}
