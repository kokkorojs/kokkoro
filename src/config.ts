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

const config_path = resolve(__workname, 'kokkoro.yml');
const config_data = readFileSync(config_path, 'utf8');
const kokkoro_config = parse(config_data) as KokkoroConfig;

export function setBotConfig(uin: number, bot_config: BotConfig) {
  kokkoro_config.bots[uin] = bot_config;
  return setKokkoroConfig();
}

export async function cutBotConfig(uin: number) {
  const { bots } = kokkoro_config;
  delete bots[uin];
  return setKokkoroConfig();
}

export function setKokkoroConfig() {
  return writeFile(config_path, stringify(kokkoro_config));
}

export function getKokkoroConfig() {
  return kokkoro_config;
}