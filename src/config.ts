import { resolve } from 'path';
import { writeFile } from 'fs/promises';
import { PrivateMessageEvent } from 'oicq';

import { GlobalConfig } from '..';
import { parseCommand } from './command';

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
  configHanders, getGlobalConfig, addBot, cutBot,
}