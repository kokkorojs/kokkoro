import { spawn } from 'child_process';
import { segment, PrivateMessageEvent } from 'oicq';

import { KOKKORO_VERSION } from '.';
import { writeSetting } from './setting';
import { getBotList, addBot, getBot } from './bot';
import { Plugin, disablePlugin, enablePlugin, findPlugin, reloadPlugin } from './plugin';

export const extension = new Plugin().init('kokkoro', __filename).version(KOKKORO_VERSION);

//#region 打印
extension
  .command('print <message>')
  .description('打印输出信息，一般用作测试')
  .sugar(/^(打印|输出)\s?(?<message>.+)$/)
  .action(function (message: string) {
    this.event.reply(message);
  });
//#endregion

//#region 重启
extension
  .command('restart')
  .description('重启进程')
  .limit(5)
  .sugar(/^重启$/)
  .action(function () {
    setTimeout(() => {
      spawn(
        process.argv.shift()!,
        process.argv,
        {
          cwd: __workname,
          detached: true,
          stdio: 'inherit',
        }
      ).unref();
      process.exit(0);
    }, 1000);

    this.event.reply('またね♪');
  });
//#endregion

//#region 关机
extension
  .command('shutdown')
  .description('结束进程')
  .limit(5)
  .sugar(/^关机$/)
  .action(function () {
    setTimeout(() => process.exit(0), 1000);
    this.event.reply('お休み♪');
  });
//#endregion

//#region 状态
extension
  .command('state', 'private')
  .description('查看 bot 运行信息')
  .limit(5)
  .sugar(/^(状态)$/)
  .action(function () {
    const bot_list = getBotList();
    const message: string[] = [];

    for (const [uin, bot] of bot_list) {
      const nickname = bot.nickname ?? 'unknown';
      const state = bot.isOnline() ? '在线' : '离线';
      const group_count = `${bot.gl.size} 个`;
      const friend_count = `${bot.fl.size} 个`;
      const message_min_count = `${bot.stat.msg_cnt_per_min}/分`;
      const bot_info = `${nickname}(${uin})
  状　态：${state}
  群　聊：${group_count}
  好　友：${friend_count}
  消息量：${message_min_count}`;

      message.push(bot_info);
    }
    this.event.reply(message.join('\n'));
  });
//#endregion

//#region 登录
extension
  .command('login <uin>', 'private')
  .description('添加登录新的 qq 账号，默认在项目启动时自动登录')
  .limit(5)
  .sugar(/^(登录|登陆)\s?(?<uin>[1-9][0-9]{4,11})$/)
  .action(async function (uin: string) {
    const qq = +uin;
    const bot_list = getBotList();

    if (!bot_list.has(qq)) {
      addBot.call(this.bot, qq, this.event);
    } else {
      const bot = await getBot(qq);

      if (bot.isOnline()) {
        this.event.reply('Error: 已经登录过这个账号了');
      } else {
        bot
          .on('system.login.qrcode', (event) => {
            this.event.reply([
              segment.image(event.image),
              '\n使用手机 QQ 扫码登录，输入 “cancel” 取消登录',
            ]);

            const listenLogin = (event: PrivateMessageEvent) => {
              if (event.sender.user_id === this.event.sender.user_id && event.raw_message === 'cancel') {
                bot.terminate();
                clearInterval(interval_id);
                this.event.reply('登录已取消');
              }
            }
            const interval_id = setInterval(async () => {
              const { retcode } = await bot.queryQrcodeResult();

              if (retcode === 0 || ![48, 53].includes(retcode)) {
                bot.login();
                clearInterval(interval_id);
                retcode && this.event.reply(`Error: 错误代码 ${retcode}`);
                bot.off('message.private', listenLogin);
              }
            }, 2000);

            bot.on('message.private', listenLogin)
          })
          .once('system.login.error', data => {
            bot.terminate();
            this.event.reply(`Error: ${data.message}`);
          })
          .once('system.online', () => {
            this.event.reply('Sucess: 已将该账号上线');
          })
          .login();
      }
    }
  });
//#endregion

//#region 登出
extension
  .command('logout <uin>', 'private')
  .description('下线已登录的 qq 账号')
  .limit(5)
  .sugar(/^(下线|登出)\s?(?<uin>[1-9][0-9]{4,11})$/)
  .action(async function (uin: string) {
    let message = '';
    const qq = +uin;
    const bot_list = getBotList();

    switch (true) {
      case !bot_list.has(qq):
        message = 'Error: 账号输入错误，无法找到该 bot 实例';
        break;
      case qq === this.bot.uin:
        message = 'Error: 该账号为当前 bot 实例，无法下线';
        break;
    }

    if (message) {
      return this.event.reply(message);
    }
    const bot = await getBot(qq);

    bot.logout()
      .then(() => {
        this.event.reply('Success: 已将该账号下线');
      })
      .catch(error => {
        this.event.reply(`Error: ${error.message}`);
      })
  });
//#endregion

//#region 插件
extension
  .command('plugin', 'private')
  .description('插件模块列表')
  .limit(5)
  .sugar(/^(插件)$/)
  .action(function () {
    findPlugin()
      .then(plugin_dir => {
        const { modules, plugins } = plugin_dir;
        const modules_message = modules.length ? modules.join(', ') : '什么都没有哦';
        const plugins_message = plugins.length ? plugins.join(', ') : '什么都没有哦';

        this.event.reply(`node_module: \n  ${modules_message}\nplugin: \n  ${plugins_message}`);
      })
      .catch(error => {
        this.event.reply(error.message);
      })
  });
//#endregion

//#region 启用
extension
  .command('enable <...names>', 'private')
  .description('启用插件')
  .limit(5)
  .sugar(/^(启用)\s?(?<names>([a-z]|\s)+)$/)
  .action(async function (names: string[]) {
    const uin = this.bot.uin;
    const message: string[] = [];
    const names_length = names.length;

    for (let i = 0; i < names_length; i++) {
      const name = names[i];

      await enablePlugin(name, uin)
        .then(() => {
          writeSetting(uin);
          message.push(`${name}:\n  启用插件成功`);
        })
        .catch(error => {
          message.push(`${name}:\n  启用插件失败，${error.message}`);
        })
    }
    this.event.reply(message.join('\n'));

    // TODO ⎛⎝≥⏝⏝≤⎛⎝ 插件事件
    // emitter.emit('plugin.enable', names);
  });
//#endregion

//#region 禁用
extension
  .command('disable <...names>', 'private')
  .description('禁用插件')
  .limit(5)
  .sugar(/^(禁用)\s?(?<names>([a-z]|\s)+)$/)
  .action(async function (names: string[]) {
    const uin = this.bot.uin;
    const message: string[] = [];
    const names_length = names.length;

    for (let i = 0; i < names_length; i++) {
      const name = names[i];

      await disablePlugin(name, uin)
        .then(() => {
          writeSetting(uin);
          message.push(`${name}:\n  禁用插件成功`);
        })
        .catch(error => {
          message.push(`${name}:\n  禁用插件失败，${error.message}`);
        })
    }
    this.event.reply(message.join('\n'));

    // TODO ⎛⎝≥⏝⏝≤⎛⎝ 插件事件
    // emitter.emit('plugin.disable', names);
  });
//#endregion

//#region 重载
extension
  .command('reload <...names>', 'private')
  .description('重载插件')
  .limit(5)
  .sugar(/^(重载)\s?(?<names>([a-z]|\s)+)$/)
  .action(async function (names: string[]) {
    const message: string[] = [];
    const names_length = names.length;

    for (let i = 0; i < names_length; i++) {
      const name = names[i];

      await reloadPlugin(name)
        .then(() => message.push(`${name}:\n  重载插件成功`))
        .catch(error => message.push(error.message))
    }
    this.event.reply(message.join('\n'));
  });
//#endregion

//#region 群服务
extension
  .command('server', 'group')
  .description('群服务列表')
  .sugar(/^(服务|群服务|列表)$/)
  .action(function () {
    const message = ['plugin:'];
    const group_id = this.event.group_id;
    const setting = this.bot.getSetting();

    const plugins = setting.plugins;
    const plugins_length = plugins.length;

    for (let i = 0; i < plugins_length; i++) {
      const name = plugins[i];
      const option = setting[group_id].plugin[name];

      message.push(`  ${name}: ${option.apply}`)
    }
    this.event.reply(message.join('\n'));
  });
//#endregion

//#region 开启
extension
  .command('open <...names>', 'group')
  .description('开启插件群聊监听')
  .limit(4)
  .sugar(/^(开启|打开)\s?(?<names>([a-z]|\s)+)$/)
  .action(function (names: string[]) {
    const uin = this.bot.uin;
    const message: string[] = [];
    const names_length = names.length;
    const group_id = this.event.group_id;
    const plugins = this.bot.getSetting().plugins;

    for (let i = 0; i < names_length; i++) {
      const name = names[i];

      if (!plugins.includes(name)) {
        message.push(`${name}:\n  插件不存在`);
        continue;
      }
      const option = this.bot.getOption(group_id, name);

      if (!option.apply) {
        option.apply = true;
        message.push(`${name}:\n  插件成功开启监听`);
      } else {
        message.push(`${name}:\n  插件正常监听中，不要重复开启监听`);
      }
    }
    writeSetting(uin);
    this.event.reply(message.join('\n'));
  });
//#endregion

//#region 关闭
extension
  .command('close <...names>', 'group')
  .description('关闭插件群聊监听')
  .limit(4)
  .sugar(/^(关闭)\s?(?<names>([a-z]|\s)+)$/)
  .action(function (names: string[]) {
    const uin = this.bot.uin;
    const message: string[] = [];
    const names_length = names.length;
    const group_id = this.event.group_id;
    const plugins = this.bot.getSetting().plugins;

    for (let i = 0; i < names_length; i++) {
      const name = names[i];

      if (!plugins.includes(name)) {
        message.push(`${name}:\n  插件不存在`);
        continue;
      }
      const option = this.bot.getOption(group_id, name);

      if (option.apply) {
        option.apply = false;
        message.push(`${name}:\n  插件成功关闭监听`);
      } else {
        message.push(`${name}:\n  插件未开启群聊监听，不要重复关闭`);
      }
    }
    writeSetting(uin);
    this.event.reply(message.join('\n'));
  });
//#endregion
