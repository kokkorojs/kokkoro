import { stringify } from 'yaml';
import { spawn } from 'child_process';
import { GroupMessageEvent, PrivateMessageEvent } from 'oicq';

import { HELP_ALL } from './help';
import { cutBotConfig, getConfig } from './config';
import { getList, setOption } from './setting';
import { addBot, AllMessageEvent, Bot, getAllBot, getBot } from './bot';
import { enablePlugin, disablePlugin, reloadPlugin, findAllPlugin, disableAllPlugin } from './plugin';

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
  async echo(param) {
    return param.join(' ');
  },
};

all_command.group = {
  async list(param, event) {
    const group_id = (event as GroupMessageEvent).group_id;

    return getList.bind(this)(group_id);
  },
};

all_command.private = {
  async help(param) {
    const [key] = param;
    return HELP_ALL[key] ?? HELP_ALL.default;
  },

  async config() {
    const kokkoro_config = getConfig();
    return stringify(kokkoro_config.bots[this.uin]);
  },

  async restart() {
    setTimeout(() => {
      spawn(process.argv.shift() as string, process.argv, { cwd: __workname, detached: true, stdio: 'inherit' }).unref();
      process.exit(0);
    }, 1000);

    return `またね♪`;
  },

  async shutdown() {
    setTimeout(() => process.exit(0), 1000);

    return `お休み♪`;
  },

  async enable(param) {
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

  async disable(param) {
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

  async reload(param) {
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

  async plugin() {
    const message: string[] = [];

    await findAllPlugin()
      .then(({ plugin_modules, node_modules, all_plugin }) => {
        message.push(`# 当前目录共检索到 ${plugin_modules.length + node_modules.length} 个插件\nplugins:`);

        for (let plugin_name of [...plugin_modules, ...node_modules]) {
          if (plugin_name.startsWith('kokkoro-')) plugin_name = plugin_name.slice(8);

          const plugin = all_plugin.get(plugin_name);
          message.push(`  ${plugin_name}: ${plugin?.roster.has(this.uin) ? 'enable' : 'disable'}`);
        }
      })
      .catch(error => {
        message.push(`Error: ${error.message}`);
      })

    return message.join('\n');
  },

  async bot() {
    const all_bot = getAllBot();
    const message: string[] = [];

    for (const [uin, bot] of all_bot) {
      message.push(`${bot.nickname} (${uin})\n  状　态：${bot.isOnline() ? '在线' : '离线'}\n  群　聊：${bot.gl.size} 个\n  好　友：${bot.fl.size} 个\n  消息量：${bot.stat.msg_cnt_per_min}/分`);
    }
    return message.join('\n');
  },

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

  async delete(param) {
    const uin = Number(param[0]);
    const bot = getBot(uin);

    if (!bot)
      return `Error: 账号输入错误，无法找到该实例`;
    if (bot.isOnline()) {
      return `Error：此机器人正在登录中，请先注销在删除`;
    }
    await disableAllPlugin(bot);
    await cutBotConfig(uin);

    return `Sucess：已删除此机器人实例`;
  },
};

/**
 * 添加插件命令
 */
async function addPluginCommand() {
  const { plugin_modules, node_modules } = await findAllPlugin();
  const plugins = [...plugin_modules, ...node_modules.map(i => i.replace('kokkoro-', ''))];

  for (const plugin_name of plugins) {
    all_command.group[plugin_name] = async (param, event, plugin = plugin_name) => {
      return setOption([plugin, ...param], <GroupMessageEvent>event);
    }
  }
}

addPluginCommand();