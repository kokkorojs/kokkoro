import { Logger } from 'log4js';
import { stringify } from 'yaml';
import { spawn } from 'child_process';
import { Client, Config, DiscussMessageEvent, GroupMessageEvent, PrivateMessageEvent } from 'oicq';

import { HELP_ALL } from './help';
import { enablePlugin, disablePlugin, reloadPlugin } from './plugin';
// import { addBot, configHanders, cutBot } from './config';
// import { getList, setOption, settingHanders } from './setting';
import { addBot, AllMessageEvent, Bot, getAllBot, getBot } from './bot';
import { getConfig } from './config';
// import { bindMasterEvents, Bot, createBot, getAllBot, getBot } from './bot';

export type CommandType = 'all' | 'group' | 'private';

export const all_command: {
  [type in CommandType]: {
    [command: string]: (
      this: Bot,
      param: ReturnType<typeof parseCommand>['param'],
      event: AllMessageEvent,
    ) => Promise<string>
  }
} = {
  all: {},
  group: {},
  private: {},
};

/**
 * 解析指令字段
 * 
 * @param {string} command - 命令
 * @returns {Object}
 */
export function parseCommand(command: string) {
  const [order, ...param] = command.split(' ');

  return {
    order, param,
  };
}

all_command.all = {
  // 复读
  async echo(param) {
    return param.join(' ');
  },
};

all_command.group = {
  //   //#region setting
  //   async setting(param, event) {
  //     if (param[0] === 'help') { return HELP_ALL.setting }

  //     return await settingHanders(param, event as GroupMessageEvent);
  //   },
  //   //#endregion

  //   //#region list
  //   async list(param, event) {
  //     return getList(event as GroupMessageEvent);
  //   },
  //   //#endregion
};

all_command.private = {
  // help
  async help(param) {
    const [key] = param;
    return HELP_ALL[key] ?? HELP_ALL.default;
  },

  // config
  async config() {
    const kokkoro_config = getConfig();
    return stringify(kokkoro_config.bots[this.uin]);
  },

  // restart
  async restart() {
    setTimeout(() => {
      spawn(process.argv.shift() as string, process.argv, { cwd: __workname, detached: true, stdio: 'inherit' }).unref();
      process.exit(0);
    }, 1000);

    return `またね♪`;
  },

  // shutdown
  async shutdown() {
    setTimeout(() => process.exit(0), 1000);

    return `お休み♪`;
  },

  //#region enable
  async enable(param, event) {
    const name = param[0];
    const uin = this.uin;
    const bot = getBot(uin)!;

    try {
      await enablePlugin(name, bot);
      return `${bot.nickname} (${uin}) 启用插件成功`;
    } catch (error: any) {
      return error.message;
    }
  },
  //#endregion

  //#region disable
  async disable(param, event) {
    const name = param[0];
    const uin = this.uin;
    const bot = getBot(uin)!;

    try {
      await disablePlugin(name, bot);
      return `${bot.nickname} (${uin}) 禁用插件成功`;
    } catch (error: any) {
      return error.message;
    }
  },

  async reload(param, event) {
    const name = param[0];
    const uin = this.uin;
    const bot = getBot(uin)!;

    try {
      await reloadPlugin(name, bot);
      return `${bot.nickname} (${uin}) 重启插件成功`;
    } catch (error: any) {
      return error.message;
    }
  },
  //#endregion

  //   //#region plugin
  //   async plugin(param, event) {
  //     const cmd = param[0];

  //     if (!cmd) {
  //       try {
  //         const { plugin_modules, node_modules, all_plugin } = await plugin.findAllPlugins();
  //         const msg = ['可用插件模块列表：'];

  //         for (let name of [...plugin_modules, ...node_modules]) {
  //           if (name.startsWith('kokkoro-')) name = name.slice(8)

  //           const plugin = all_plugin.get(name);
  //           msg.push(`▼ ${name} (${plugin ? '已' : '未'}导入)`);

  //           if (plugin) {
  //             for (let bot of plugin.binds) msg.push(`\t${bot.nickname} (${bot.uin}),`);
  //           }
  //         }
  //         msg.push(`\n※ 当前目录共检索到 ${plugin_modules.length + node_modules.length} 个插件`);

  //         return msg.join('\n')
  //       } catch (error) {
  //         const { message } = error as Error;

  //         return `Error: ${message}`;
  //       }
  //     }
  //     if (cmd === 'help') {
  //       return HELP_ALL.plugin;
  //     }

  //     const name = param[1];
  //     const all_bot = getAllBot();

  //     let msg = '';

  //     try {
  //       if (!name) throw new Error('请输入插件名称');

  //       switch (cmd) {
  //         case 'on-all':
  //           for (let [_, bot] of all_bot) {
  //             await plugin.enable(name, bot)
  //           }
  //           msg = '全部机器人启用插件成功'
  //           break
  //         case 'off-all':
  //           for (let [_, bot] of all_bot) {
  //             await plugin.disable(name, bot)
  //           }
  //           msg = '全部机器人禁用插件成功'
  //           break
  //         case 'del':
  //           await plugin.deletePlugin(name)
  //           msg = '卸载插件成功'
  //           break
  //         case 'restart':
  //           await plugin.restartPlugin(name)
  //           msg = '重启插件成功'
  //           break
  //         default:
  //           throw new Error(`未知参数 "${cmd}"`)
  //       }
  //       return `Success: ${msg}`
  //     } catch (error) {
  //       const { message } = error as Error;

  //       return `Error: ${message}`;
  //     }
  //   },
  //   //#endregion

  //   // #region set
  //   async set(param, event) {
  //     const { self_id } = event as PrivateMessageEvent;

  //     let bot = getBot(self_id) as Client;
  //     let key = param[0] as keyof Config;
  //     let value = param[1] as any;

  //     if (!key)
  //       return `// 修改输入：>set <key> <value>\n// 修改 platform 需要重新登录\n"${self_id}" ${JSON.stringify(bot.config, null, 2)}`
  //     if (!Reflect.has(bot.config, key))
  //       return `Error：请输入正确的key`
  //     if (!value)
  //       return `Error：请输入正确的value`
  //     if (value === `false`)
  //       value = false
  //     if (typeof bot.config[key] === `boolean`)
  //       value = Boolean(value)
  //     if (typeof bot.config[key] === `number`)
  //       value = isNaN(Number(value)) ? bot.config[key] : Number(value)

  //     bot.config[key] = value as never;

  //     if (key === `log_level`) {
  //       (bot.logger as Logger).level = value
  //     }

  //     try {
  //       // await setGlobalConfig()
  //       return `Success: 设置成功`
  //     } catch (error) {
  //       const { message } = error as Error;

  //       return `Error: ${message}`
  //     }
  //   },
  //   // #endregion

  // login
  async login(param, event) {
    const uin = Number(param[0]);
    const all_bot = getAllBot();

    switch (true) {
      case all_bot.has(uin):
        const bot = all_bot.get(uin);

        if (bot!.isOnline()) {
          return 'Error：已经登录过这个账号了';
        } else {
          bot!.login();
          return 'Sucess：已将该账号上线';
        }
      case !uin:
        return 'Error：请输入账号';
    }
    addBot.bind(this)(uin, <PrivateMessageEvent>event);

    return `>开始登录流程，账号 ${uin}`;
  },
  // logout
  async logout(param) {
    const uin = Number(param[0]);
    const bot = getBot(uin);

    if (!bot) return `Error: 账号输入错误，无法找到该实例`;
    if (uin === this.uin) return `Error: 该账号为当前 bot 实例，无法下线`;

    try {
      await bot.logout();
    } catch (error: any) {
      return `Error：${error.message}`;
    }
    return `Success：已将该账号下线`;
  },
  // delete
  async delete(param) {
    const uin = Number(param[0]);
    const bot = getBot(uin);

    if (!bot)
      return `Error: 账号输入错误，无法找到该实例`;
    if (bot.isOnline()) {
      return `Error：此机器人正在登录中，请先登出在删除`;
    }
    // await plugin.disableAllPlugin(bot);
    // all_bot.delete(uin);
    // cutBot(uin);
    return `Sucess：已删除此机器人实例`;
  },
  // bot
  async bot(param) {
    const all_bot = getAllBot();
    const message: string[] = [`当前已登录账号：`];

    for (const [uin, bot] of all_bot) {
      message.push(`▼ ${bot.nickname} (${uin})\n\t状　态：${bot.isOnline() ? '在线' : '离线'}\n\t群　聊：${bot.gl.size} 个\n\t好　友：${bot.fl.size} 个\n\t消息量：${bot.stat.msg_cnt_per_min}/分`);
    }
    return message.join('\n');
  },
};

// 添加插件
// async function addPluginHanders() {
//   const { plugin_modules, node_modules } = await plugin.findAllPlugins();

//   for (const plugin_name of [...plugin_modules, ...node_modules.map(i => i.replace('kokkoro-', ''))]) {
//     all_command.group[plugin_name] = async (param, event, plugin = plugin_name) => {
//       return setOption([plugin, ...param], <GroupMessageEvent>event);
//     }
//   }
// }

// addPluginHanders();

// export {
//   all_command, parseCommand, addPluginHanders,
// }