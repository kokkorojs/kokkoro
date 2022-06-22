import { join } from 'path';
import { Dirent } from 'fs';
import { mkdir, readdir } from 'fs/promises';
import { isMainThread, parentPort, MessagePort } from 'worker_threads';

import { Listen } from './listen';
import { proxyParentPort } from '../worker';

const modules_path = join(__workname, 'node_modules');
const plugins_path = join(__workname, 'plugins');

export interface PluginInfo {
  name: string;
  path: string;
}

export class Plugin {
  private events: Set<string>;
  private listeners: Map<string, Listen>;
  private botPort: Map<number, MessagePort>;

  constructor(
    public name: string = '',
  ) {
    if (isMainThread) {
      throw new Error('你在主线程跑这个干吗？');
    } else {
      proxyParentPort();

      this.events = new Set();
      this.listeners = new Map();
      this.botPort = new Map();

      // 绑定插件线程通信
      parentPort?.on('bind.port', (event) => {
        const { uin, port } = event;

        this.botPort.set(uin, port);
        this.events.forEach((name, uin) => {
          const pluginBindEvent = {
            name: 'bind.event',
            event: { name },
          };

          port.postMessage(pluginBindEvent);
          port.on(name, (event: any) => {
            this.listeners.get(name)!.run(port, event);
          });
        });
      });
    }
  }

  listen(name: string) {
    const listen = new Listen();

    // 单个插件事件不允许重复监听
    this.events.add(name);
    this.listeners.set(name, listen);
    return listen;
  }
}

//   //   bindBot(bot: Bot): Plugin {
//   //     const { uin } = bot;

//   //     if (this.bot_list.has(uin)) {
//   //       throw new Error(`bot is already bind with "${this.name}"`);
//   //     }
//   //     this.bot_list.set(uin, bot);
//   //     console.log('bind bot');
//   //     // this.emit('plugin.bind', bot);
//   //     return this;
//   //   }
// }


// /**
//  * 创建 bot 线程
//  * 
//  * @param {number} uin - bot uin
//  * @param {Config} config - bot config
//  * @returns {Bot} bot 实例对象
//  */
// export function createPluginThread(filename: string): void {
//   const worker = new Worker(filename);

//   worker
//     .on('online', () => {
//       console.log(`创建 plugin ${filename} 线程`);
//     })
//     .on('message', (message) => {
//       console.log(`主线程收到消息`, message);
//       // worker.postMessage(message);
//     })
//     .on('error', error => {
//       console.log(`线程 ${filename}炸了，`, error.message);
//     })
//     .on('exit', code => {
//       console.log(`${filename} 线程已退出，代码: ${code}`);
//       console.log('正在重启...');

//       setTimeout(() => {
//         createPluginThread(filename);
//       }, 1000);
//     })
// }

// export function runPluginServer() {
//   findPlugin().then(({ modules, plugins }) => {
//     plugins.forEach(raw_path => {
//       const plugin_path = require.resolve(raw_path);
//       createPluginThread(plugin_path);
//     })
//   })
// }

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
      // 移除文件名前缀
      const name = dir.name.replace('kokkoro-plugin-', '');
      const path = join(modules_path, name);

      try {
        require.resolve(path);
        const info: PluginInfo = {
          name, path,
        };
        modules.push(info);
      } catch { }
    }
  }

  return {
    modules, plugins,
  }
}
