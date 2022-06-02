import { Client, Config as Protocol } from 'oicq';
import { filter, fromEvent, Subject } from "rxjs";

import { bot_dir } from '.';
import { deepMerge } from './utils';
import { EventMap, event_names } from './events';

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

class BotClient extends Subject<any> {
  bot: Bot;

  constructor(uin: number) {
    super();
    this.bot = new Bot(uin);

    for (let i = 0; i < event_names.length; i++) {
      const name = event_names[i];

      fromEvent(this.bot, name).subscribe(event => {
        event ||= {};
        (event as any).event_name = name;
        this.next(event);
      })
    }
    this.bot.login();
  }
}

export function event<T extends keyof EventMap>(name: T) {
  return filter((event: EventMap[T]) => event.event_name === name);
}

// const bot = new BotClient();

// bot
//   .pipe(
//     event('system.login.qrcode'),
//   )
//   .subscribe(event => {
//     console.log(event);
//   })

// bot
//   .pipe(
//     event('message'),
//   )
//   .subscribe(event => {
//     console.log(event);
//   })


// bot
//   .pipe(
//     event('system.online'),
//   )
//   .subscribe(() => {
//     console.log('Logged in!');
//   })
