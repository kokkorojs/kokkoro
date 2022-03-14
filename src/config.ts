import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parse, stringify } from 'yaml';
import { writeFile } from 'fs/promises';

import { BotConfig } from './bot';

// kokkoro 全局配置
export interface KokkoroConfig {
  // 服务端口
  port: number;
  // bot 信息
  bots: {
    // uin 账号
    [uin: number]: BotConfig;
  }
}

const config_path: string = resolve(__workname, 'kokkoro.yml');
const config_data: string = readFileSync(config_path, 'utf8');
const kokkoro_config: KokkoroConfig = parse(config_data);

export function setBotConfig(uin: number, bot_config: BotConfig) {
  kokkoro_config.bots[uin] = bot_config;
  return setConfig();
}

export async function cutBotConfig(uin: number) {
  const { bots } = kokkoro_config;
  delete bots[uin];
  return setConfig();
}

export function setConfig() {
  return writeFile(config_path, stringify(kokkoro_config));
}

export function getConfig() {
  return kokkoro_config;
}
