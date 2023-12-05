import { LogLevel } from 'amesu';
import { BotConfig } from '@kokkoro/core';
import { readFile } from 'node:fs/promises';

export type KokkoroConfig = {
  /** web 服务 */
  server: {
    port: number;
    domain: string;
  };
  /** 日志等级，打印日志会降低性能，若消息量巨大建议修改此参数 */
  logLevel: LogLevel;
  /** bot 信息 */
  bots: BotConfig[];
};

export async function getConfig(): Promise<KokkoroConfig> {
  const text = await readFile('kokkoro.json', 'utf8');
  const config = <KokkoroConfig>JSON.parse(text);

  return config;
}
