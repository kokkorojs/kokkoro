import { join } from 'path';
import { Dirent } from 'fs';
import { mkdir, readdir } from 'fs/promises';
import { isMainThread, parentPort, MessagePort } from 'worker_threads';
// import { isMainThread, Worker, workerData, parentPort } from 'worker_threads';
// // import { Bot, getBotPool } from "./bot";
// // import { createChildThread } from "./worker";

const modules_path = join(__workname, 'node_modules');
const plugins_path = join(__workname, 'plugins');

export interface PluginInfo {
  name: string;
  path: string;
}
export class Plugin {
  botPort!: MessagePort;
  listeners: string[];

  constructor(
    public name: string = '',
  ) {
    if (isMainThread) {
      throw new Error('你在主线程跑这个干吗？');
    } else {
      this.listeners = [];

      parentPort!.on('message', value => {
        const { name, event } = value;

        parentPort!.emit(name, event);
        console.log(`plugin 收到主线程消息: ${value}`);
      });

      parentPort?.once('bind.port', (event) => {
        this.botPort = event.port;

        this.botPort.postMessage({
          name: 'bind.event',
          event: {
            listeners: this.listeners,
          }
        });
      });
    }
  }

  listen(name: string) {
    this.listeners.push(name);
  }
  //     // this.bot_list = new Map();
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
