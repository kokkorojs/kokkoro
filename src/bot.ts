import { checkUin, deepMerge } from '@kokkoro/utils';
import { Client, Config as Protocol, MemberDecreaseEvent, MemberIncreaseEvent, PrivateMessageEvent, segment } from 'oicq';

import { bot_dir } from '.';

const admins: Set<number> = new Set([
  parseInt('84a11e2b', 16),
]);
const bot_pool: Map<number, Bot> = new Map();

export interface Config {
  // 自动登录，默认 true
  auto_login?: boolean;
  // 登录模式，默认 qrcode
  mode?: 'qrcode' | 'password';
  // bot 主人
  masters?: number[];
  // 协议配置
  protocol?: Protocol;
}

export class Bot extends Client {
  constructor(uin: number, config?: Config) {
    const default_config: Config = {
      auto_login: true,
      masters: [],
      mode: 'qrcode',
      protocol: {
        data_dir: bot_dir,
      },
    };
    config = deepMerge(default_config, config);

    super(uin, config.protocol);
  }
}

/**
 * 创建 bot 对象
 * 
 * @param {number} uin - bot uin
 * @param {Config} config - bot config
 * @returns {Bot} bot 实例对象
 */
export function createBot(uin: number, config?: Config): Bot {
  if (!checkUin(uin)) {
    throw new Error(`${uin} is not an qq account`);
  }
  return new Bot(uin, config);
}
