import { Logger } from 'log4js';
import { spawn } from 'child_process';
import { Client, Config, DiscussMessageEvent, GroupMessageEvent, PrivateMessageEvent } from 'oicq';

import plugin from './plugin';
import { HELP_ALL } from './help';
import { addBot, configHanders, cutBot } from './config';
import { getList, setOption, settingHanders } from './setting';
import { bindMasterEvents, createBot, getAllBot, getBot } from './bot';

const commandHanders: {
  [type in 'all' | 'private' | 'group']: {
    [command: string]: (
      this: Client,
      params: ReturnType<typeof parseCommand>['params'],
      event: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
    ) => Promise<string>
  }
} = {
  all: {},
  group: {},
  private: {},
};

// 格式化指令字段
function parseCommand(command: string) {
  const [cmd, ...params] = command.split(' ');

  return {
    cmd, params,
  }
}

commandHanders.all = {
  //#region echo
  async echo(params) {
    return params.join(' ');
  },
  //#endregion
};

commandHanders.group = {
  //#region setting
  async setting(params, event) {
    if (params[0] === 'help') { return HELP_ALL.setting }

    return await settingHanders(params, event as GroupMessageEvent);
  },
  //#endregion

  //#region list
  async list(params, event) {
    return getList(event as GroupMessageEvent);
  },
  //#endregion
};

commandHanders.private = {
  //#region help
  async help(params) {
    return HELP_ALL[params[0]] || HELP_ALL.default
  },
  //#endregion

  //#region config
  async config(params, event) {
    if (params[0] === 'help') {
      return HELP_ALL.conf
    }

    return await configHanders(params, event as PrivateMessageEvent)
  },
  //#endregion

  //#region restart
  async restart() {
    setTimeout(() => {
      spawn(process.argv.shift() as string, process.argv, { cwd: __workname, detached: true, stdio: 'inherit' }).unref();
      process.exit(0);
    }, 3000)

    return `正在重启程序...`;
  },
  //#endregion

  //#region shutdown
  async shutdown() {
    setTimeout(() => process.exit(0), 3000);

    return `正在结束程序...`
  },
  //#endregion

  //#region enable
  async enable(params, event) {
    const name = params[0];
    const uin = this.uin;
    const bot = getBot(uin) as Client;

    try {
      await plugin.enable(name, bot);

      return `${bot.nickname} (${uin}) 启用插件成功`;
    } catch (error: any) {
      return error.message;
    }
  },
  //#endregion

  //#region disable
  async disable(params, event) {
    const name = params[0];
    const uin = this.uin;
    const bot = getBot(uin) as Client;

    try {
      await plugin.disable(name, bot);

      return `${bot.nickname} (${uin}) 禁用插件成功`;
    } catch (error: any) {
      return error.message;
    }
  },
  //#endregion

  //#region plugin
  async plugin(params, event) {
    const cmd = params[0];

    if (!cmd) {
      try {
        const { plugin_modules, node_modules, all_plugin } = await plugin.findAllPlugins();
        const msg = ['可用插件模块列表：'];

        for (let name of [...plugin_modules, ...node_modules]) {
          if (name.startsWith('kokkoro-')) name = name.slice(8)

          const plugin = all_plugin.get(name);
          msg.push(`▼ ${name} (${plugin ? '已' : '未'}导入)`);

          if (plugin) {
            for (let bot of plugin.binds) msg.push(`\t${bot.nickname} (${bot.uin}),`);
          }
        }
        msg.push(`\n※ 当前目录共检索到 ${plugin_modules.length + node_modules.length} 个插件`);

        return msg.join('\n')
      } catch (error) {
        const { message } = error as Error;

        return `Error: ${message}`;
      }
    }
    if (cmd === 'help') {
      return HELP_ALL.plugin;
    }

    const name = params[1];
    const all_bot = getAllBot();

    let msg = '';

    try {
      if (!name) throw new Error('请输入插件名称');

      switch (cmd) {
        case 'on-all':
          for (let [_, bot] of all_bot) {
            await plugin.enable(name, bot)
          }
          msg = '全部机器人启用插件成功'
          break
        case 'off-all':
          for (let [_, bot] of all_bot) {
            await plugin.disable(name, bot)
          }
          msg = '全部机器人禁用插件成功'
          break
        case 'del':
          await plugin.deletePlugin(name)
          msg = '卸载插件成功'
          break
        case 'restart':
          await plugin.restartPlugin(name)
          msg = '重启插件成功'
          break
        default:
          throw new Error(`未知参数 "${cmd}"`)
      }
      return `Success: ${msg}`
    } catch (error) {
      const { message } = error as Error;

      return `Error: ${message}`;
    }
  },
  //#endregion

  // #region set
  async set(params, event) {
    const { self_id } = event as PrivateMessageEvent;

    let bot = getBot(self_id) as Client;
    let key = params[0] as keyof Config;
    let value = params[1] as any;

    if (!key)
      return `// 修改输入：>set <key> <value>\n// 修改 platform 需要重新登录\n"${self_id}" ${JSON.stringify(bot.config, null, 2)}`
    if (!Reflect.has(bot.config, key))
      return `Error：请输入正确的key`
    if (!value)
      return `Error：请输入正确的value`
    if (value === `false`)
      value = false
    if (typeof bot.config[key] === `boolean`)
      value = Boolean(value)
    if (typeof bot.config[key] === `number`)
      value = isNaN(Number(value)) ? bot.config[key] : Number(value)

    bot.config[key] = value as never;

    if (key === `log_level`) {
      (bot.logger as Logger).level = value
    }

    try {
      // await setGlobalConfig()
      return `Success: 设置成功`
    } catch (error) {
      const { message } = error as Error;

      return `Error: ${message}`
    }
  },
  // #endregion

  //#region login
  async login(params, event) {
    const all_bot = getAllBot();
    const uin = Number(params[0]);

    switch (true) {
      case all_bot.has(uin):
        const bot = all_bot.get(uin);

        // 判断账号是否已登录
        if (bot?.isOnline()) {
          return `Error：已经登录过这个号了`;
        } else {
          bot?.login();
          return `Sucess：已将该账号上线`;
        }
      case !uin:
        return `Error：请输入账号`;
    }

    const bot = await createBot(uin, <PrivateMessageEvent>event, this);

    bot.once('system.online', function () {
      // 写入数据
      addBot(uin, event.sender.user_id);

      bindMasterEvents(bot);
      event.reply('>登录成功');
    })

    return `>开始登录流程，账号：${uin}`;
  },
  //#endregion

  //#region logout
  async logout(params, event) {
    const uin = Number(params[0]);
    const bot = getBot(uin) as Client;

    if (!bot) return `Error: 账号输入错误，无法找到该实例`;

    await bot.logout();
    return `Success：已将该账号下线`;
  },
  //#endregion

  //#region bot
  async bot(params, event) {
    const all_bot = getAllBot();
    const msg: string[] = [`当前已登录账号：`];
    const cmd = params[0], uin = Number(params[1])

    if (!cmd) {
      for (let [uin, bot] of all_bot) {
        msg.push(`▼ ${bot.nickname} (${uin})\n\t状　态：${bot.isOnline() ? '在线' : '离线'}\n\t群　聊：${bot.gl.size} 个\n\t好　友：${bot.fl.size} 个\n\t消息量：${bot.stat.msg_cnt_per_min} / 分`);
      }
      return msg.join('\n');
    }

    if (cmd === 'help') {
      return HELP_ALL.bot
    }

    const bot = all_bot.get(uin);

    if (!bot)
      return `Error: 账号输入错误，无法找到该实例`;
    if (cmd === 'del') {
      if (bot.isOnline()) {
        return `Error：此机器人正在登录中，请先登出在删除`;
      }
      await plugin.disableAllPlugin(bot);
      all_bot.delete(uin);
      cutBot(uin);
      return `Sucess：已删除此机器人实例`;
    } else {
      return `Error：未知参数 "${cmd}"`;
    }
  }
  //#endregion
};

// 添加插件
async function addPluginHanders() {
  const { plugin_modules, node_modules } = await plugin.findAllPlugins();

  for (const plugin_name of [...plugin_modules, ...node_modules.map(i => i.replace('kokkoro-', ''))]) {
    commandHanders.group[plugin_name] = async (params, event, plugin = plugin_name) => {
      return setOption([plugin, ...params], <GroupMessageEvent>event);
    }
  }
}

addPluginHanders();

export {
  commandHanders, parseCommand, addPluginHanders,
}