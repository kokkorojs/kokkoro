import { join } from 'path';
import { createHash } from 'crypto';
import { spawn } from 'child_process';
import { writeFile, readFile } from 'fs/promises';
import { Client, createClient, Config, PrivateMessageEvent, GroupMessageEvent, DiscussMessageEvent, GroupMessage, segment } from 'oicq';

import { HELP_ALL } from './help';
import plugin from './plugin';
import { getUserLevel } from './util';
import { getList, setOption, handleSetting } from './setting';
import { getGlobalConfig, parseCommandline, handleConfig, addBot, cutBot } from './config';

// 所有机器人实例
const all_bot: Map<number, Client> = new Map();

//#region broadcastOne

/**
 * @description 单个 bot 给 masters 发消息
 * @param bot - bot 实例对象
 * @param message - 发送的消息文本
 */
function broadcastOne(bot: Client, message: string) {
  const { uin } = bot;
  const { bots } = getGlobalConfig();
  const { masters } = bots[uin];

  for (const master of masters) bot.sendPrivateMsg(master, `通知：\n　　${message}`);
}

//#endregion

//#region broadcastAll

/**
 * @description 全部 bot 给全部 master 发消息
 * @param message - 发送的消息文本
 */
function broadcastAll(message: string) {
  const { bots } = getGlobalConfig();

  for (const uin in bots) {
    const { masters } = bots[uin];

    for (const master of masters) {

      all_bot.forEach(bot => bot.isOnline() && bot.sendPrivateMsg(master, `通知：\n　　${message}`));
    }
  }
}

//#endregion

//#region onMessage

/**
 * @description 指令消息监听
 * @param this - bot 实例对象
 * @param data - bot 接收到的消息对象
 */
async function onMessage(this: Client, event: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent) {
  let message;

  const { message_type, raw_message } = event;
  const { user_level, prefix } = getUserLevel(event);

  // 权限判断，群聊指令需要 level 3 以上，私聊指令需要 level 5 以上
  switch (message_type) {
    case 'group':
      if (user_level < 3 || !raw_message.startsWith(prefix)) return
      break;
    case 'private':
      if (user_level < 5 || !raw_message.startsWith(prefix)) return
      break;
  }
  const { cmd, params } = parseCommandline(raw_message.replace(prefix, ''));

  for (const type of ['all', 'group', 'private']) {
    if (!eval(`cmdHanders.${type}[cmd]`)) continue

    this.logger.info(`收到指令，正在处理: ${raw_message}`);

    if (message_type !== type && type !== 'all') {
      event.reply(`Error：指令 ${cmd} 不支持${message_type === 'group' ? '群聊' : '私聊'}`);
      return
    }

    message = await eval(`cmdHanders.${type}[cmd]?.call(this, params, event)`);
  }

  message = message || `Error：未知指令: ${cmd}`;

  event.reply(message);
  this.logger.info(`处理完毕，指令回复: ${message}`);
}

//#endregion

//#region loginBot

// 登录 bot
async function loginBot(): Promise<Map<number, Client>> {
  const { bots } = getGlobalConfig();

  for (const uin in bots) {
    const { auto_login, login_mode, config } = bots[uin];

    // 是否自动登录
    if (!auto_login) break

    const data_dir = join(__workname, '/data/bots');
    const bot = createClient(
      Number(uin),
      { ...config, data_dir }
    );

    bot.logger.mark(`正在登录账号: ${uin}`);

    switch (login_mode) {
      /**
       * 扫描登录
       * 
       * 优点是不需要过滑块和设备锁
       * 缺点是万一 token 失效，无法自动登录，需要重新扫码
       */
      case 'qrcode':
        bot
          .on("system.login.qrcode", function (event) {
            bot.logger.mark(`扫码完成后敲击 "Enter" 继续...`);

            process.stdin.once("data", () => {
              this.login();
            });
          })
          .on('system.login.error', function (event) {
            this.terminate();
            bot.logger.error(`当前账号无法登录，按 "Enter" 键退出程序...`);
            process.stdin.once('data', process.exit);
          })
          .login();
        break;

      /**
       * 密码登录
       * 
       * 优点是一劳永逸
       * 缺点是需要过滑块，可能会报环境异常
       */
      case 'password':
        bot
          // 监听滑动验证码事件
          .on("system.login.slider", function (event) {
            bot.logger.mark(`取 ticket 教程：https://github.com/takayama-lily/oicq/wiki/01.滑动验证码和设备锁`);

            process.stdout.write('ticket: ');
            process.stdin.once("data", this.submitSlider.bind(this));
          })
          // 监听登录保护验证事件
          .on('system.login.device', function () {
            bot.logger.mark(`验证完成后敲击 "Enter" 继续...`);

            process.stdin.once('data', () => this.login());
          })
          .on('system.login.error', function (event) {
            const { message } = event;

            if (message.includes('密码错误')) {
              inputPassword(bot);
            } else {
              this.terminate();
              bot.logger.error(`当前账号无法登录，按 "Enter" 键退出程序...`);
              process.stdin.once('data', process.exit);
            }
          })

        try {
          bot.login(await readFile(join(bot.dir, 'password')));
        } catch {
          inputPassword(bot);
        }
        break;

      default:
        bot.logger.error(`你他喵的 login_mode 改错了`);
        break;
    }

    all_bot.set(Number(uin), bot);
  }

  return all_bot
}

//#endregion

//#region inputPassword

// 输入密码
function inputPassword(bot: Client) {
  bot.logger.mark(`首次登录请输入密码：`);

  process.stdin.once('data', async data => {
    const input = String(data).trim();

    if (!input.length) return inputPassword(bot);

    const password = createHash('md5').update(input).digest();

    await writeFile(join(bot.dir, 'password'), password, { mode: 0o600 });
    bot.login(password);
  })
}

//#endregion

//#region createBot

// 创建 bot
async function createBot(uin: number, delegate: PrivateMessageEvent, parent: Client) {
  const config: Config = {
    platform: 5,
    log_level: 'info',
    data_dir: join(__workname, '/data/bots'),
  };
  const bot: Client = createClient(uin, config);

  bot
    .on("system.login.qrcode", function (event) {
      const { image } = event;

      delegate.reply([
        `>登录流程：扫码完成后输入 "ok"\n>取消登录：输入 "cancel"\n`,
        segment.image(image)
      ]);

      // 监听消息
      parent.on("message.private", function listenLogin(event) {
        if (event.from_id === delegate.from_id) {

          const { raw_message } = event;

          switch (raw_message) {
            case 'ok':
              bot.login();
              this.off("message.private", listenLogin);
              break;

            case 'cancel':
              bot.terminate();
              delegate.reply(">登录流程：已取消");
              break;
          }
        }
      })
    })
    .on("system.login.error", function (data) {
      this.terminate();
      delegate.reply(`>登录流程遇到错误：${data.message}\n>登录已取消`);
    })
    .login();

  return bot
}

//#endregion

function onOnline(this: Client) {
  broadcastOne(this, `此账号刚刚从掉线中恢复，现在一切正常。`)
}

function onOffline(this: Client, event: { message: string; }) {
  const { message } = event;

  broadcastAll(this.uin + `已离线，\n原因为：${message}`)
}

//#region bindMasterEvents

async function bindMasterEvents(bot: Client) {
  const { uin } = bot;
  all_bot.set(uin, bot);

  bot.removeAllListeners('system.login.slider');
  bot.removeAllListeners('system.login.device');
  bot.removeAllListeners('system.login.error');
  bot.on('system.online', onOnline);
  bot.on('system.offline', onOffline);
  bot.on('message', onMessage);

  let number = 0;
  const plugins = await plugin.restorePlugins(bot);

  for (let [_, plugin] of plugins) {
    if (plugin.binds.has(bot)) ++number;
  }
  setTimeout(() => {
    const { bots } = getGlobalConfig();
    const { prefix } = bots[uin];

    broadcastOne(bot, `启动成功，启用了 ${number} 个插件，发送 "${prefix}help" 可以查询 bot 相关指令`)
  }, 1000);
}

//#endregion

const cmdHanders: {
  [type in 'all' | 'private' | 'group']: {
    [cmd: string]: (
      this: Client,
      params: ReturnType<typeof parseCommandline>['params'],
      event: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
    ) => Promise<string>
  }
} = {
  all: {
    //#region echo
    async echo(params) {
      return params.join(' ');
    },
    //#endregion
  },
  group: {
    //#region setting
    async setting(params, event) {
      if (params[0] === 'help') { return HELP_ALL.setting }

      const { self_id, group_id } = event as any;
      return await handleSetting(params, self_id, group_id);
    },
    //#endregion

    //#region list
    async list(params, event) {
      const { self_id, group_id } = event as any;

      return getList(self_id, group_id);
    },
    //#endregion


    //#region option
    async option(params, event) {
      const { self_id, group_id } = event as any;

      return setOption(self_id, group_id, params);
    },
    //#endregion
  },
  private: {
    //#region help
    async help(params) {
      return HELP_ALL[params[0]] || HELP_ALL.default
    },
    //#endregion

    //#region conf
    async conf(params, event) {
      if (params[0] === 'help') {
        return HELP_ALL.conf
      }

      return await handleConfig(params, this.uin)
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
      const bot = all_bot.get(uin) as Client;

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
      const bot = all_bot.get(uin) as Client;

      try {
        await plugin.disable(name, bot);

        return `${bot.nickname} (${uin}) 禁用插件成功`;
      } catch (error: any) {
        return error.message;
      }
    },
    //#endregion

    //#region plug
    async plug(params, event) {
      const cmd = params[0];

      if (!cmd) {
        try {
          const { plugin_modules, node_modules, plugins } = await plugin.findAllPlugins();
          const msg = ['可用插件模块列表：'];

          for (let name of [...plugin_modules, ...node_modules]) {
            if (name.startsWith('kokkoro-')) name = name.slice(8)

            const plugin = plugins.get(name);
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
        return HELP_ALL.plug
      }
      const name = params[1];
      const uin = Number(params[2]) || this.uin;
      const bot = all_bot.get(uin);
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
            throw new Error(`未知参数：${cmd}`)
        }
        return `Success: ${msg}`
      } catch (error) {
        const { message } = error as Error;

        return `Error: ${message}`;
      }
    },
    //#endregion

    //#region set
    // async set(params, event) {
    //   let bot = all_bot.get(event.self_id) as Client;
    //   let key = params[0] as keyof ConfBot;
    //   let value = params[1] as any;

    //   if (!key)
    //     return `// 修改输入：>set <key> <value>\n// 修改 platform 需要重新登录\n"${event.self_id}" ${JSON.stringify(bot.config, null, 2)}`
    //   if (!Reflect.has(bot.config, key))
    //     return `Error：请输入正确的key`
    //   if (!value)
    //     return `Error：请输入正确的value`
    //   if (value === `false`)
    //     value = false
    //   if (typeof bot.config[key] === `boolean`)
    //     value = Boolean(value)
    //   if (typeof bot.config[key] === `number`)
    //     value = isNaN(Number(value)) ? bot.config[key] : Number(value)
    //   bot.config[key] = value;
    //   if (key === `log_level`) {
    //     bot.logger.level = value
    //   }

    //   try {
    //     await writeConfBot(bot)
    //     return `Success: 设置成功`
    //   } catch (error) {
    //     const { message } = error as Error;

    //     return `Error: ${message}`
    //   }
    // },
    //#endregion

    //#region login
    async login(params, event) {
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
      const bot = all_bot.get(uin);

      if (!bot) return `Error: 账号输入错误，无法找到该实例`;

      await bot.logout();
      return `Success：已将该账号下线`;
    },
    //#endregion

    //#region bot
    async bot(params, event) {
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
        await plugin.disableAll(bot);
        all_bot.delete(uin);
        cutBot(uin);
        return `Sucess：已删除此机器人实例`;
      } else {
        return `Error：未知参数：${cmd}`;
      }
    }
    //#endregion
  },
};

export {
  loginBot, createBot, bindMasterEvents
}