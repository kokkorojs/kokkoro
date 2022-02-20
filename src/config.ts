import { resolve } from 'path';
import { writeFile } from 'fs/promises';
import { PrivateMessageEvent } from 'oicq';

import { Bot, BotConfig } from './bot';
import { parseCommand } from './command';
import { HELP_ALL } from './help';

// kokkoro 全局配置
export interface GlobalConfig {
  // 服务端口
  port: number;
  // bot 信息
  bots: {
    // uin 账号
    [uin: number]: BotConfig;
  }
}

const config_path = resolve(__workname, 'kkrconfig.json');
const global_config: GlobalConfig = require(config_path);

export function setBotConfig(uin: number, bot_config: BotConfig) {
  global_config.bots[uin] = bot_config;
  return setGlobalConfig();
}

export async function cutBotConfig(uin: number) {
  const { bots } = global_config;
  delete bots[uin];
  return setGlobalConfig();
}

export function setGlobalConfig() {
  return writeFile(config_path, `${JSON.stringify(global_config, null, 2)}`);
}

export function getGlobalConfig() {
  return global_config;
}

export async function configCommand(this: Bot, params: ReturnType<typeof parseCommand>['params'], event: PrivateMessageEvent): Promise<string> {
  let message: string;

  const { uin } = this;
  const [param] = params;

  switch (param) {
    case undefined:
      message = `${uin}: ${JSON.stringify(global_config.bots[uin], null, 2)}`;
      break;
    case 'help':
      message = HELP_ALL.config;
      break;
    default:
      message = `Error: 未知参数 "${param}"`;
      break;
  }

  return message;
}