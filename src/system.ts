import { AUTHOR, LICENSE, UPDAY, VERSION } from '@/kokkoro';
import { Plugin, retrievalPluginInfos, getPluginList, importPlugin, destroyPlugin } from '@/plugin';

interface AllSettledResult {
  status: 'fulfilled' | 'rejected';
  value: any;
  reason: Error;
}

interface AllSettledMessage {
  fulfilled: string[];
  rejected: string[];
  error: string[];
}

const plugin = new Plugin();

plugin
  .version(VERSION)

//#region 打印
plugin
  .command('print <message>')
  .description('打印测试')
  .sugar(/^(打印|输出)\s?(?<message>.+)$/)
  .action(async (ctx) => {
    await ctx.reply(ctx.query.message);
  });
//#endregion

//#region 状态
plugin
  .command('state')
  .description('查看 bot 运行信息')
  .sugar(/^(状态)$/)
  .action(async (ctx) => {
    const { bot } = ctx;
    const { nickname, gl, fl, stat } = bot;

    const group_count = `${gl.size} 个`;
    const friend_count = `${fl.size} 个`;
    const message_min_count = `${stat.msg_cnt_per_min}/分`;
    const state = `${nickname}(${ctx.self_id})
    群　聊：${group_count}
    好　友：${friend_count}
    消息量：${message_min_count}`;

    await ctx.reply(state);
  });
//#endregion

//#region 插件
plugin
  .command('plugin')
  .description('插件模块列表')
  .sugar(/^(插件)$/)
  .action(async (ctx) => {
    const pluginInfos = await retrievalPluginInfos();
    const list: {
      node_modules: string[];
      plugins: string[];
    } = {
      node_modules: [],
      plugins: [],
    };
    const infos_length = pluginInfos.length;

    for (let i = 0; i < infos_length; i++) {
      const info = pluginInfos[i];
      const { folder, local } = info;

      local ? list.plugins.push(folder) : list.node_modules.push(folder);
    }
    await ctx.reply(JSON.stringify(list, null, 2));
  });
//#endregion

//#region 挂载
plugin
  .command('mount <...names>')
  .description('挂载插件')
  .limit(5)
  .sugar(/^(挂载)\s?(?<names>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { names } = ctx.query;
    const names_length = names.length;
    const mountQueue = [];

    for (let i = 0; i < names_length; i++) {
      const name = names[i];
      mountQueue.push(mountPlugin(name));
    }
    await Promise.allSettled(mountQueue)
      .then((results) => {
        const message: AllSettledMessage = {
          fulfilled: [],
          rejected: [],
          error: [],
        };

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const { status, reason } = result as AllSettledResult;
          const name = names[i];

          if (status === 'fulfilled') {
            message.fulfilled.push(name);
          } else {
            message.rejected.push(name);
            message.error.push(reason.message);
          }
        }
        return ctx.reply(JSON.stringify(message, null, 2));
      })
  });
//#endregion

//#region 卸载
plugin
  .command('unmount <...names>')
  .description('卸载插件')
  .limit(5)
  .sugar(/^(卸载)\s?(?<names>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { names } = ctx.query;
    const names_length = names.length;
    const unmountQueue = [];

    for (let i = 0; i < names_length; i++) {
      const name = names[i];
      unmountQueue.push(unmountPlugin(name));
    }
    await Promise.allSettled(unmountQueue)
      .then((results) => {
        const message: AllSettledMessage = {
          fulfilled: [],
          rejected: [],
          error: [],
        };

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const { status, reason } = result as AllSettledResult;
          const name = names[i];

          if (status === 'fulfilled') {
            message.fulfilled.push(name);
          } else {
            message.rejected.push(name);
            message.error.push(reason.message);
          }
        }
        return ctx.reply(JSON.stringify(message, null, 2));
      })
  });
//#endregion

//#region 重载
plugin
  .command('reload <...names>')
  .description('重载插件')
  .limit(5)
  .sugar(/^(重载)\s?(?<names>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { names } = ctx.query;
    const names_length = names.length;
    const reloadQueue = [];

    for (let i = 0; i < names_length; i++) {
      const name = names[i];

      reloadQueue.push(Promise.all([
        await unmountPlugin(name),
        await mountPlugin(name),
      ]));
    }
    await Promise.allSettled(reloadQueue)
      .then((results) => {
        const message: AllSettledMessage = {
          fulfilled: [],
          rejected: [],
          error: [],
        };

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const { status, reason } = result as AllSettledResult;
          const name = names[i];

          if (status === 'fulfilled') {
            message.fulfilled.push(name);
          } else {
            message.rejected.push(name);
            message.error.push(reason.message);
          }
        }
        return ctx.reply(JSON.stringify(message, null, 2));
      })
  });
//#endregion

//#region 启用
plugin
  .command('enable <...names>')
  .description('启用插件')
  .limit(4)
  .sugar(/^(启用)\s?(?<names>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { bot, query } = ctx;
    const { names } = query;
    const names_length = names.length;
    const enableQueue = [];

    for (let i = 0; i < names_length; i++) {
      const name = names[i];
      enableQueue.push(bot.enablePlugin(name));
    }
    await Promise.allSettled(enableQueue)
      .then((results) => {
        const message: AllSettledMessage = {
          fulfilled: [],
          rejected: [],
          error: [],
        };

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const { status, reason } = result as AllSettledResult;
          const name = names[i];

          if (status === 'fulfilled') {
            message.fulfilled.push(name);
          } else {
            message.rejected.push(name);
            message.error.push(reason.message);
          }
        }
        return ctx.reply(JSON.stringify(message, null, 2));
      })
  });
//#endregion

//#region 禁用
plugin
  .command('disable <...names>')
  .description('禁用插件')
  .limit(4)
  .sugar(/^(禁用)\s?(?<names>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { bot, query } = ctx;
    const { names } = query;
    const names_length = names.length;
    const disableQueue = [];

    for (let i = 0; i < names_length; i++) {
      const name = names[i];
      disableQueue.push(bot.disablePlugin(name));
    }
    await Promise.allSettled(disableQueue)
      .then((results) => {
        const message: AllSettledMessage = {
          fulfilled: [],
          rejected: [],
          error: [],
        };

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const { status, reason } = result as AllSettledResult;
          const name = names[i];

          if (status === 'fulfilled') {
            message.fulfilled.push(name);
          } else {
            message.rejected.push(name);
            message.error.push(reason.message);
          }
        }
        return ctx.reply(JSON.stringify(message, null, 2));
      })
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
      await ctx.reply(JSON.stringify(server, null, 2));
    } else {
      await ctx.reply(`server 指令仅支持群聊，若要查看本地可用插件，可使用 plugin 指令`);
    }
  });
//#endregion

//#region 应用
plugin
  .command('apply <...names>')
  .description('应用群服务')
  .limit(3)
  .sugar(/^(应用)\s?(?<names>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { bot, group_id, query } = ctx;

    if (group_id) {
      const { names } = query;
      const names_length = names.length;
      const applyQueue = [];

      for (let i = 0; i < names_length; i++) {
        const name = names[i];
        applyQueue.push(bot.updateOption(group_id, name, 'apply', true));
      }
      await Promise.allSettled(applyQueue)
        .then((results) => {
          const message: AllSettledMessage = {
            fulfilled: [],
            rejected: [],
            error: [],
          };

          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const { status, reason } = result as AllSettledResult;
            const name = names[i];

            if (status === 'fulfilled') {
              message.fulfilled.push(name);
            } else {
              message.rejected.push(name);
              message.error.push(reason.message);
            }
          }
          return ctx.reply(JSON.stringify(message, null, 2));
        })
    } else {
      await ctx.reply(`apply 指令仅支持群聊，若要为该 bot 启用插件，可使用 enable 指令`);
    }
  });
//#endregion

//#region 免除
plugin
  .command('exempt <...names>')
  .description('免除群服务')
  .limit(3)
  .sugar(/^(免除)\s?(?<names>([a-z]|\s)+)$/)
  .action(async (ctx) => {
    const { bot, group_id, query } = ctx;

    if (group_id) {
      const { names } = query;
      const names_length = names.length;
      const applyQueue = [];

      for (let i = 0; i < names_length; i++) {
        const name = names[i];
        applyQueue.push(bot.updateOption(group_id, name, 'apply', false));
      }
      await Promise.allSettled(applyQueue)
        .then((results) => {
          const message: AllSettledMessage = {
            fulfilled: [],
            rejected: [],
            error: [],
          };

          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const { status, reason } = result as AllSettledResult;
            const name = names[i];

            if (status === 'fulfilled') {
              message.fulfilled.push(name);
            } else {
              message.rejected.push(name);
              message.error.push(reason.message);
            }
          }
          return ctx.reply(JSON.stringify(message, null, 2));
        })
    } else {
      await ctx.reply(`exempt 指令仅支持群聊，若要为该 bot 禁用插件，可使用 disable 指令`);
    }
  });
//#endregion

//#region 帮助
plugin
  .command('help')
  .description('帮助信息')
  .sugar(/^(帮助)$/)
  .action(async (ctx) => {
    const message = ['Commands: '];
    const commands_length = plugin.commands.length;

    for (let i = 0; i < commands_length; i++) {
      const command = plugin.commands[i];
      const { raw_name, desc } = command;

      message.push(`  ${raw_name}  ${desc}`);
    }
    message.push('\nMore: https://kokkoro.js.org/');
    await ctx.reply(message.join('\n'));
  });
//#endregion

//#region 版本
plugin
  .command('version')
  .description('版本信息')
  .sugar(/^(版本|ver)$/)
  .action(async (ctx) => {
    const version = {
      name: 'kokkoro',
      version: VERSION,
      upday: UPDAY,
      author: AUTHOR,
      license: LICENSE,
      repository: 'https://github.com/kokkorojs/kokkoro/'
    };
    await ctx.reply(JSON.stringify(version, null, 2));
  });
//#endregion

/**
 * 挂载插件
 * 
 * @param name - 插件名
 */
async function mountPlugin(name: string): Promise<void> {
  const pl = getPluginList();

  if (pl.has(name)) {
    throw new Error(`插件 ${name} 已被挂载`);
  }

  try {
    const pluginInfos = await retrievalPluginInfos();
    const infos_length = pluginInfos.length;

    for (let i = 0; i < infos_length; i++) {
      const info = pluginInfos[i];

      if (info.name === name) {
        const plugin = importPlugin(info);

        plugin.bl.forEach((bot) => {
          bot.emit('bot.profile.refresh');
        });
        return;
      }
    }
    const error = new Error(`plugins 与 node_modules 目录均未检索到 "${name}" 和 "kokkoro-plugin-${name}" 插件`);
    throw error;
  } catch (error) {
    throw error;
  }
}

/**
 * 卸载插件
 * 
 * @param name - 插件名
 */
async function unmountPlugin(name: string): Promise<void> {
  const pl = getPluginList();

  if (!pl.has(name)) {
    throw new Error(`插件 ${name} 未被挂载`);
  }

  try {
    const plugin = pl.get(name)!;

    plugin.emit('plugin.destroy');
    destroyPlugin(plugin.info);
  } catch (error) {
    throw error;
  }
}
