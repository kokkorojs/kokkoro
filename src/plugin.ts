import { join } from 'path';
import { Dirent } from 'fs';
import { readdir, mkdir } from 'fs/promises';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { EventMap, PrivateMessageEvent, segment } from 'oicq';
import { Job, JobCallback, scheduleJob } from 'node-schedule';

import { Listen } from './listen';
import { KOKKORO_VERSION } from '.';
import { AllMessageEvent } from './events';
import { getSetting, writeSetting } from './setting';
import { deepClone, deepMerge, logger } from './util';
import { Bot, getBotList, addBot, getBot } from './bot';
import { Command, commandEvent, CommandMessageType } from './command';

const modules_path = join(__workname, 'node_modules');
const plugins_path = join(__workname, 'plugins');
const plugin_list: Map<string, Plugin> = new Map();

// 插件选项
export interface Option {
  // 锁定，默认 false
  lock: boolean;
  // 开关，默认 true
  apply: boolean;
  // 其它设置
  [param: string]: string | number | boolean | Array<string | number>;
}

export class Plugin extends EventEmitter {
  private ver: string;

  private name!: string;
  private path!: string;

  private args: (string | string[])[];
  private jobs: Job[];
  private bot_list: Map<number, Bot>;
  private events: Set<string>;
  private command_list: Map<string, Command>;
  private listen_list: Map<string, Listen>

  constructor(
    public prefix: string = '',
    private option: Option = { apply: true, lock: false },
  ) {
    super();
    this.ver = '0.0.0';
    this.args = [];
    this.jobs = [];
    this.bot_list = new Map();
    this.events = new Set();
    this.command_list = new Map();
    this.listen_list = new Map();

    //#region 更新指令
    const updateCommand = new Command('group', 'update <key> <value>', this)
      .description('群服务列表')
      .action(function (key: string, value: string) {
        this.update(key, value);
      });
    //#endregion
    //#region 帮助指令
    const helpCommand = new Command('all', 'help', this)
      .description('帮助信息')
      .action(function () {
        const message = ['Commands: '];

        for (const [_, command] of this.plugin.command_list) {
          const { raw_name, desc } = command;
          message.push(`  ${raw_name}  ${desc}`);
        }
        this.event.reply(message.join('\n'));
      });
    //#endregion
    //#region 版本指令
    const versionCommand = new Command('all', 'version', this)
      .description('版本信息')
      .action(function () {
        const plugin = this.plugin;

        this.event.reply(`${plugin.name} v${plugin.ver}`);
      });
    //#endregion

    this.parse = this.parse.bind(this);
    this.trigger = this.trigger.bind(this);
    this.on('plugin.bind', this.bindEvents);

    setTimeout(() => {
      this.command_list.set(helpCommand.name, helpCommand);
      this.command_list.set(updateCommand.name, updateCommand);
      this.command_list.set(versionCommand.name, versionCommand);
    });
  }

  init(name: string, path: string) {
    this.name = name;
    this.path = path;

    return this;
  }

  command<T extends keyof commandEvent>(raw_name: string, message_type: T | CommandMessageType = 'all'): Command<T> {
    const command = new Command(message_type, raw_name, this);

    this.events.add('message');
    this.command_list.set(command.name, command);
    return command as unknown as Command<T>;
  }

  listen<T extends keyof EventMap>(event_name: T) {
    const listener = new Listen(event_name, this);

    this.events.add(event_name);
    this.listen_list.set(event_name, listener);
    return listener;
  }

  schedule(cron: string, func: JobCallback) {
    const job = scheduleJob(cron, func);

    this.jobs.push(job);
    return this;
  }

  version(ver: string) {
    this.ver = ver;
    return this;
  }

  private clearSchedule() {
    for (const job of this.jobs) {
      job.cancel();
    }
  }

  // 指令解析器
  private parse(event: AllMessageEvent) {
    for (const [_, command] of this.command_list) {
      if (command.isMatched(event)) {
        this.args = command.parseArgs(event.raw_message);
        this.runCommand(command);
        // TODO ⎛⎝≥⏝⏝≤⎛⎝ 插件事件
        // this.emit(`plugin.${this.name}`, event);
      }
    }
  }

  // 事件触发器
  private trigger(event: any) {
    for (const [_, listen] of this.listen_list) {
      listen.func && listen.func(event);
    }
  }

  // 执行指令
  private runCommand(command: Command) {
    const args_length = this.args.length;

    for (let i = 0; i < args_length; i++) {
      const { required, value } = command.args[i];
      const argv = this.args[i];

      if (required && !argv) {
        return command.event.reply(`Error: <${value}> cannot be empty`);
      } else if (required && !argv.length) {
        return command.event.reply(`Error: <...${value}> cannot be empty`);
      }
    }

    if (command.isLimit()) {
      command.event.reply('权限不足');
    } else if (command.func && this.prefix === '') {
      command.func(...this.args);
    } else if (command.message_type !== 'private' && command.stop && !command.isApply()) {
      command.stop();
    } else if (command.message_type !== 'private' && command.func && command.isApply()) {
      command.func(...this.args);
    } else if (command.message_type === 'private' && command.func) {
      command.func(...this.args);
    }
  }

  // 绑定 bot 事件
  bindEvents(bot: Bot): void {
    for (const event_name of this.events) {
      if (event_name === 'message') {
        bot.on(event_name, this.parse);
        this.once('plugin.unbind', () => bot.off(event_name, this.parse));
      } else {
        bot.on(event_name, this.trigger);
        this.once('plugin.unbind', () => bot.off(event_name, this.trigger));
      }
    }
  }

  getOption() {
    // 深拷贝防止 default option 被修改
    return deepClone(this.option);
  }

  //   hasBot(uin: number) {
  //     return this.bot_list.has(uin);
  //   }

  getName() {
    return this.name;
  }

  getBot(uin: number): Bot {
    if (!this.bot_list.has(uin)) {
      throw new Error(`bot "${uin}" is undefined`);
    }
    return this.bot_list.get(uin)!;
  }

  getBotList(): Map<number, Bot> {
    return this.bot_list;
  }

  bindBot(bot: Bot): Plugin {
    const { uin } = bot;

    if (this.bot_list.has(uin)) {
      throw new Error(`bot is already bind with "${this.name}"`);
    }
    this.bot_list.set(uin, bot);
    this.emit('plugin.bind', bot);
    return this;
  }

  unbindBot(bot: Bot): void {
    const { uin } = bot;

    if (!this.bot_list.has(uin)) {
      throw new Error(`bot is not bind with "${this.name}"`);
    }
    this.clearSchedule();
    this.bot_list.delete(uin);
    this.emit('plugin.unbind');
  }

  // 销毁
  destroy() {
    for (const [_, bot] of this.bot_list) {
      this.unbindBot(bot);
    }
    this.off('plugin.bind', this.bindEvents);
    plugin_list.delete(this.name);
    destroyPlugin(this.path);
  }
}

export const extension = new Plugin().init('kokkoro', __filename).version(KOKKORO_VERSION);

//#region 测试
extension
  .command('test')
  .description('测试')
  .sugar(/^(测试)$/)
  .action(function () {
    console.log('test...')
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

//#region 打印
extension
  .command('print <message>')
  .description('打印输出信息，一般用作测试')
  .sugar(/^(打印|输出)\s?(?<message>.+)$/)
  .action(function (message: string) {
    this.event.reply(message);
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
  .description('插件模块')
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

/**
 * 检索可用插件
 *
 * @returns Promise
 */
async function findPlugin() {
  const modules_dir: Dirent[] = [];
  const plugins_dir: Dirent[] = [];
  const modules: string[] = [];
  const plugins: string[] = [];

  try {
    const dirs = await readdir(plugins_path, { withFileTypes: true });
    plugins_dir.push(...dirs);
  } catch (error) {
    await mkdir(plugins_path);
  }

  for (const dir of plugins_dir) {
    if (dir.isDirectory() || dir.isSymbolicLink()) {
      const plugin_path = join(plugins_path, dir.name);

      try {
        require.resolve(plugin_path);
        plugins.push(dir.name);
      } catch { }
    }
  }

  try {
    const dirs = await readdir(modules_path, { withFileTypes: true });
    modules_dir.push(...dirs);
  } catch (err) {
    await mkdir(modules_path);
  }

  for (const dir of modules_dir) {
    if (dir.isDirectory() && dir.name.startsWith('kokkoro-plugin-')) {
      const module_path = join(modules_path, dir.name);

      try {
        require.resolve(module_path);
        modules.push(dir.name);
      } catch { }
    }
  }

  return {
    modules, plugins,
  }
}

/**
 * 导入插件模块
 *
 * @param {string} name - 模块名
 * @returns {Promise<Plugin>} 插件实例对象
 */
async function importPlugin(name: string): Promise<Plugin> {
  // 移除文件名前缀
  const plugin_name = name.replace('kokkoro-plugin-', '');

  if (plugin_list.has(plugin_name)) return await getPlugin(plugin_name);

  let plugin_path = '';
  try {
    const { modules, plugins } = await findPlugin();

    for (const raw_name of plugins) {
      if (raw_name === name || raw_name === 'kokkoro-plugin-' + name) {
        plugin_path = join(plugins_path, raw_name);
        break;
      }
    }

    // 匹配 npm 模块
    if (!plugin_path) {
      for (const raw_name of modules) {
        if (raw_name === name || raw_name === 'kokkoro-plugin-' + name) {
          plugin_path = join(modules_path, raw_name);
          break;
        }
      }
    }
    if (!plugin_path) throw new Error('cannot find this plugin');

    const { plugin } = require(plugin_path) as { plugin?: Plugin };

    if (plugin instanceof Plugin) {
      const require_path = require.resolve(plugin_path);

      plugin.init(plugin_name, require_path);
      plugin_list.set(plugin_name, plugin);
      return plugin;
    }
    throw new Error(`plugin not instantiated`);
  } catch (error) {
    const message = `"${name}" import module failed, ${(error as Error).message}`;
    logger.error(message);
    // destroyPlugin(require.resolve(plugin_path));
    throw new Error(message);
  }
}

/**
 * 销毁插件
 *
 * @param plugin_path - 插件路径
 */
function destroyPlugin(plugin_path: string) {
  const module = require.cache[plugin_path];
  const index = module?.parent?.children.indexOf(module);

  if (!module) {
    return;
  }
  if (index && index >= 0) {
    module.parent?.children.splice(index, 1);
  }

  for (const path in require.cache) {
    if (require.cache[path]?.id.startsWith(module.path)) {
      delete require.cache[path]
    }
  }

  delete require.cache[plugin_path];
}

/**
 * 获取插件实例
 *
 * @param {string} name - 插件名
 * @returns {Plugin} 插件实例
 */
export async function getPlugin(name: string): Promise<Plugin> {
  if (!plugin_list.has(name)) {
    throw new Error(`plugin "${name}" is undefined`);
  }
  return plugin_list.get(name)!;
}

export function getPluginList(): Map<string, Plugin> {
  return plugin_list;
}

/**
 * 启用插件
 * 
 * @param name - plugin name
 * @param uin - bot uin
 * @returns {Promise}
 */
async function enablePlugin(name: string, uin: number): Promise<void> {
  await importPlugin(name)
    .then(async () => {
      // 如果插件已被导入，仅绑定当前 bot ，否则绑定全部
      if (plugin_list.has(name)) {
        await bindBot(name, uin);
      } else {
        await bindAllBot(name);
      }
    })
    .catch(error => {
      throw error;
    })
}

/**
 * 禁用插件
 * 
 * @param name - plugin name
 * @param uin - bot uin
 * @returns {Promise}
 */
async function disablePlugin(name: string, uin: number): Promise<void> {
  await getPlugin(name)
    .then(async () => {
      await unbindBot(name, uin);
    })
    .catch(error => {
      throw error;
    })
}

/**
 * 重载插件
 *
 * @param {string} name - plugin name
 * @returns {Promise}
 */
async function reloadPlugin(name: string): Promise<void> {
  await getPlugin(name)
    .then(async plugin => {
      const bots = [...plugin.getBotList()];

      plugin.destroy();
      const ext = await importPlugin(name);

      for (const [_, bot] of bots) {
        ext.bindBot(bot);
      }
    })
    .catch(error => {
      throw error;
    })
}

/**
 * 插件绑定 bot
 *
 * @param {string} name - plugin name
 * @param {number} uin - bot uin
 * @returns {Promise}
 */
export async function bindBot(name: string, uin: number): Promise<void> {
  if (!plugin_list.has(name)) {
    throw new Error(`plugin "${name}" is undefined`);
  }
  await Promise.all([getBot(uin), getSetting(uin), getPlugin(name)])
    .then(values => {
      const [bot, setting, plugin] = values;
      const group_list = bot.getGroupList();
      const plugins = setting.plugins;

      plugin.bindBot(bot);
      // 更新 plugins
      if (!plugins.includes(name)) {
        plugins.push(name);
      }

      // 更新 option
      for (const [group_id, group_info] of group_list) {
        const { group_name } = group_info;

        setting[group_id] ||= {
          name: group_name, plugin: {},
        };

        if (setting[group_id].name !== group_name) {
          setting[group_id].name = group_name;
        }
        const default_option = plugin.getOption();
        const local_option = setting[group_id].plugin[name];
        const option = deepMerge(default_option, local_option);

        setting[group_id].plugin[name] = option;
      }
    })
    .catch(error => {
      throw error;
    })
}

/**
 * 插件解绑 bot
 *
 * @param name - plugin name
 * @param uin - bot uin
 * @returns {Promise}
 */
async function unbindBot(name: string, uin: number): Promise<void> {
  if (!plugin_list.has(name)) {
    throw new Error(`plugin "${name}" is undefined`);
  }
  await Promise.all([getBot(uin), getSetting(uin), getPlugin(name)])
    .then(values => {
      const [bot, setting, plugin] = values;
      const group_list = bot.getGroupList();
      const plugins_set = new Set(setting.plugins);

      plugin.unbindBot(bot);
      // 更新 plugins
      if (plugins_set.has(name)) {
        plugins_set.delete(name);
        setting.plugins = [...plugins_set];
      }

      // 更新 option
      for (const [group_id, group_info] of group_list) {
        const { group_name } = group_info;

        if (setting[group_id].name !== group_name) {
          setting[group_id].name = group_name;
        }
        delete setting[group_id].plugin[name];
      }
    })
    .catch(error => {
      throw error;
    })
}

/**
 * 插件绑定全部 bot
 * 
 * @param name - plugin name
 * @returns {Promise}
 */
async function bindAllBot(name: string): Promise<void> {
  const uins = getBotList().keys();

  for (const uin of uins) {
    await bindBot(name, uin).catch(error => {
      throw error;
    })
  }
}

/**
 * 导入所有插件模块
 *
 * @returns
 */
export async function importAllPlugin(): Promise<Map<string, Plugin>> {
  const { modules, plugins } = await findPlugin();
  const all_modules = [...modules, ...plugins];
  const modules_length = all_modules.length;

  if (modules_length) {
    for (let i = 0; i < modules_length; i++) {
      const name = all_modules[i];

      try {
        await importPlugin(name);
      } catch { }
    }
  }
  return plugin_list;
}
