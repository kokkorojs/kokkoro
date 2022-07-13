import { join } from 'path';
import { Dirent } from 'fs';
import { deepClone } from '@kokkoro/utils';
import { CronCommand, CronJob } from 'cron';
import { mkdir, readdir } from 'fs/promises';
import { isMainThread, parentPort, MessagePort, workerData } from 'worker_threads';

import { Listen } from './listen';
import { Command, CommandEventMap } from './command';
import { BotEventMap, PortEventMap } from '../events';
import { proxyParentPort } from '../worker';
import { Bot } from '../bot';

const modules_path = join(__workname, 'node_modules');
const plugins_path = join(__workname, 'plugins');

export type PluginInfo = {
  name: string;
  path: string;
};

// 插件选项
export type Option = {
  // 锁定，默认 false
  lock: boolean;
  // 开关，默认 true
  apply: boolean;
  // 其它设置
  [param: string]: string | number | boolean | Array<string | number>;
};

export class Plugin {
  public name: string;
  private ver: string;
  private jobs: CronJob[];
  private events: Set<string>;
  private botPort: Map<number, MessagePort>;
  private listeners: Map<string, Listen>;
  private command_list: Map<string, Command>;

  constructor(
    public prefix: string = '',
    private option: Option = { apply: true, lock: false },
  ) {
    if (isMainThread) {
      throw new Error('你在主线程跑这个干吗？');
    } else {
      proxyParentPort();

      this.name = workerData.name;
      this.ver = '0.0.0';
      this.jobs = [];
      this.events = new Set();
      this.botPort = new Map();
      this.listeners = new Map();
      this.command_list = new Map();

      //#region 帮助指令
      const helpCommand = new Command('all', 'help', this)
        .description('帮助信息')
        .action((event) => {
          const message = ['Commands: '];

          for (const [_, command] of this.command_list) {
            const { raw_name, desc } = command;
            message.push(`  ${raw_name}  ${desc}`);
          }
          event.reply(message.join('\n'));
        });
      //#endregion
      // #region 版本指令
      const versionCommand = new Command('all', 'version', this)
        .description('版本信息')
        .action((event) => {
          if (this.name) {
            event.reply(`${this.name} v${this.ver}`);
          } else {
            event.reply('当前插件未添加版本信息，可调用 Plugin.info 设置');
          }
        });
      //#endregion

      // 任何插件实例化后都将自带 version 及 help 指令
      setTimeout(() => {
        this.command_list.set(helpCommand.name, helpCommand);
        this.command_list.set(versionCommand.name, versionCommand);
      });

      // 绑定插件线程通信
      parentPort?.on('bind.bot.port', (event: PortEventMap['bind.bot.port']) => {
        const { uin, port } = event;

        this.botPort.set(uin, port);
        this.events.forEach((name) => {
          const bindPluginEvent = {
            name: 'bind.plugin.listen',
            event: { listen: name, name: this.name },
          };
          const bindSettingEvent = {
            name: 'bind.setting',
            event: { name: this.name, option },
          };

          port.postMessage(bindPluginEvent);
          port.postMessage(bindSettingEvent);

          port.on('message', (value: any) => {
            if (value.name) {
              port.emit(value.name, value.event);
            }
          })
          port.on(name, (event: any) => {
            if (name.startsWith('message')) {
              this.parseAction(event);
            } else {
              this.listeners.get(name)!.run(event);
            }
          });
        });
      });
    }
  }

  botApi<K extends keyof Bot>(uin: number, method: K, ...params: Bot[K] extends (...args: infer P) => any ? P : []) {
    return new Promise((resolve, reject) => {
      const event = {
        name: 'bot.api',
        event: { method, params },
      };

      this.botPort.get(uin)?.postMessage(event);
      this.botPort.get(uin)?.once('bot.api.callback', e => {
        resolve(e);
      })
    });
  }

  schedule(cron: string, command: CronCommand) {
    const job = new CronJob(cron, command, null, true);

    this.jobs.push(job);
    return this;
  }

  version(ver: string) {
    this.ver = ver;
    return this;
  }

  // sendMessage(event: PortEventMap['message.send']) {
  //   const { self_id } = event;
  //   const port_event = {
  //     name: 'message.send', event,
  //   };
  //   this.botPort.get(self_id)?.postMessage(port_event);
  // }

  // sendAllMessage(event: PortEventMap['message.send']) {
  //   const port_event = {
  //     name: 'message.send', event,
  //   };
  //   this.botPort.forEach((port) => {
  //     port.postMessage(port_event);
  //   })
  // }

  // recallMessage(event: any) {
  //   const { self_id } = event;
  //   this.botPort.get(self_id)?.postMessage(event);
  // }

  // 指令监听
  command<T extends keyof CommandEventMap>(raw_name: string, message_type?: T): Command<T> {
    const command = new Command(message_type, raw_name, this);

    this.events.add('message.all');
    this.command_list.set(command.name, command);
    return command;
  }

  // 事件监听
  listen<T extends keyof BotEventMap>(name: T): Listen<T> {
    const listen = new Listen(name, this);

    // 单个插件单项事件不应该重复监听
    this.events.add(name);
    this.listeners.set(name, listen);
    return listen;
  }

  // 指令解析器
  private parseAction(event: any) {
    for (const [_, command] of this.command_list) {
      if (command.isMatched(event)) {
        event.query = command.parseQuery(event.raw_message);
        command.run(event);
      }
    }
  }

  getOption() {
    // 深拷贝防止 default option 被修改
    return deepClone(this.option);
  }
}

/**
 * 检索可用插件
 *
 * @returns Promise
 */
export async function retrievalPlugin() {
  const modules_dir: Dirent[] = [];
  const plugins_dir: Dirent[] = [];
  const modules: PluginInfo[] = [];
  const plugins: PluginInfo[] = [];

  try {
    const dirs = await readdir(plugins_path, { withFileTypes: true });
    plugins_dir.push(...dirs);
  } catch (error) {
    await mkdir(plugins_path);
  }

  for (const dir of plugins_dir) {
    if (dir.isDirectory() || dir.isSymbolicLink()) {
      const name = dir.name;
      const path = join(plugins_path, name);

      try {
        require.resolve(path);
        const info: PluginInfo = {
          name, path,
        };
        plugins.push(info);
      } catch {
      }
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
      // 移除文件名前缀
      const name = dir.name.replace('kokkoro-plugin-', '');
      const path = join(modules_path, name);

      try {
        require.resolve(path);
        const info: PluginInfo = {
          name, path,
        };
        modules.push(info);
      } catch {
      }
    }
  }

  return {
    modules, plugins,
  };
}

export async function getPluginList(): Promise<string[]> {
  const { modules, plugins } = await retrievalPlugin();
  const list = [];

  for (const info of [...modules, ...plugins]) {
    list.push(info.name);
  }
  return list;
}
