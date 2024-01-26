import { readFile } from 'node:fs/promises';
import { LogLevel } from 'amesu';
import { BotConfig } from '@kokkoro/core';

export type KokkoroConfig = {
  /** web 服务 */
  server: {
    /** 端口号 */
    port: number;
    /** 域名 */
    domain: string;
  };
  /** 插件目录 */
  plugins_dir: string;
  /** 是否处于沙箱场景 */
  sandbox: boolean;
  /** 日志等级，打印日志会降低性能，若消息量巨大建议修改此参数 */
  log_level: LogLevel;
  /** 订阅事件 */
  events: BotConfig['events'];
  /** bot 信息 */
  bots: BotConfig[];
};

export async function getConfig(): Promise<KokkoroConfig> {
  const text = await readFile('kokkoro.json', 'utf-8');
  const config = <KokkoroConfig>JSON.parse(text);

  return config;
}
