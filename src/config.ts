import { resolve } from 'path';
import { writeFile } from 'fs/promises';
import { PrivateMessageEvent, Config } from 'oicq';

import { parseCommand } from './command';

// kokkoro 全局配置
interface GlobalConfig {
  // 服务端口
  port: number;
  // bot 插件
  plugins: string[];
  // bot 信息
  bots: {
    // uin 账号
    [uin: number]: {
      // 指令前缀，默认为 '>'
      prefix: string;
      // 自动登录，默认 true
      auto_login: boolean;
      // 登录模式，默认 qrcode
      login_mode: 'qrcode' | 'password';
      // bot 主人
      masters: number[];
      // 登录配置
      config: Config;
    }
  }
}

const config_path = resolve(__workname, 'kkrconfig.json');
const global_config: GlobalConfig = require(config_path);

async function setGlobalConfig() {
  return writeFile(config_path, `${JSON.stringify(global_config, null, 2)}`);
}

function getGlobalConfig() {
  return global_config;
}

async function addBot(uin: number, master: number) {
  const { bots } = global_config;

  bots[uin] = {
    prefix: '>',
    auto_login: true,
    login_mode: 'qrcode',
    masters: [master],
    config: {
      platform: 5,
      log_level: 'info',
    }
  }

  return setGlobalConfig();
}

async function cutBot(uin: number) {
  const { bots } = global_config;

  delete bots[uin];
  return setGlobalConfig();
}

async function configHanders(params: ReturnType<typeof parseCommand>['params'], event: PrivateMessageEvent): Promise<string> {
  const { self_id } = event;
  let message: string;

  switch (true) {
    case !params.length:
      const config = `${self_id}: ${JSON.stringify(global_config.bots[self_id], null, 2)}`;

      message = config;
      break;

    default:
      message = `Error: 未知参数 "${params[0]}"`;
      break;
  }

  return message;
}

export {
  GlobalConfig,
  configHanders, getGlobalConfig, addBot, cutBot,
}