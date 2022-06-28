import { join } from 'path';
import { Dirent } from 'fs';
import { mkdir, readdir } from 'fs/promises';
import { CronCommand, CronJob } from 'cron';
import { isMainThread, parentPort, MessagePort } from 'worker_threads';

import { Listen } from './listen';
import { Command } from './command';
import { BotEventMap } from '../events';
import { proxyParentPort } from '../worker';

const modules_path = join(__workname, 'node_modules');
const plugins_path = join(__workname, 'plugins');

export interface PluginInfo {
  name: string;
  path: string;
}

export class Plugin {
  private jobs: CronJob[];
  private events: Set<string>;
  private botPort: Map<number, MessagePort>;
  private listeners: Map<string, Listen>;
  private command_list: Map<string, Command>;

  constructor(
    public prefix: string = '',
  ) {
    if (isMainThread) {
      throw new Error('你在主线程跑这个干吗？');
    } else {
      proxyParentPort();

      this.jobs = [];
      this.events = new Set();
      this.botPort = new Map();
      this.listeners = new Map();
      this.command_list = new Map();

      // 绑定插件线程通信
      parentPort?.on('bind.port', (event) => {
        const { uin, port } = event;

        this.botPort.set(uin, port);
        this.events.forEach((name) => {
          const pluginBindEvent = {
            name: 'bind.event',
            event: { name, prefix },
          };

          port.postMessage(pluginBindEvent);
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

  schedule(cron: string, command: CronCommand) {
    const job = new CronJob(cron, command, null, true);

    this.jobs.push(job);
    return this;
  }

  sendMessage(event: any) {
    const { self_id } = event;
    this.botPort.get(self_id)?.postMessage(event);
  }

  recallMessage(event: any) {
    const { self_id } = event;
    this.botPort.get(self_id)?.postMessage(event);
  }

  // 指令监听
  command(raw_name: string, message_type: 'all' | 'private' | 'group' = 'all') {
    const command = new Command(raw_name, message_type, this);

    this.events.add('message');
    this.command_list.set(command.name, command);
    return command;
  }

  // 事件监听
  listen<T extends keyof BotEventMap>(name: T) {
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
        command.run(event);
      }
    }
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
