import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parse, stringify } from 'yaml';
import { writeFile } from 'fs/promises';

import { Config } from "./bot";

// kokkoro 全局配置
export interface GlobalConfig {
  // 服务端口
  port: number;
  // bot 信息
  bots: {
    // uin 账号
    [uin: number]: Config;
  }
}

const config_path: string = resolve(__workname, 'kokkoro.yml');
const base_global_config: string = readFileSync(config_path, 'utf8');
const global_config: GlobalConfig = parse(base_global_config);

function writeConfig() {
  return writeFile(config_path, stringify(global_config));
}

export function setBotConfig(uin: number, config: Config) {
  global_config.bots[uin] = config;
  return writeConfig();
}

// export function cutBotConfig(uin: number) {
//   const { bots } = kokkoro_config;
//   delete bots[uin];
//   return writeConfig();
// }

export function getGlobalConfig() {
  return global_config;
}
