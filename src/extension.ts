import { spawn } from 'child_process';
import { PrivateMessageEvent } from "oicq";
import { Job, scheduleJob } from "node-schedule";

import { Bot, AllMessageEvent, addBot } from "./bot";
import { Command, CommandType, ParsedArgv } from "./command";

export class Extension {
  name: string;
  jobs: Job[];
  commands: Command[];
  bots: Map<number, Bot>;
  event!: AllMessageEvent;
  args: ParsedArgv['args'];

  constructor() {
    this.name = '';
    this.args = [];
    this.jobs = [];
    this.commands = [];
    this.bots = new Map();

    const command = new Command('help', this)
      .description('帮助信息')
      .sugar(/^帮助$/)
      .action(function () {
        this.help();
      });
    this.commands.push(command);
  }

  command(raw_name: string, types?: CommandType[]) {
    const command = new Command(raw_name, this, types);
    this.commands.push(command);
    return command;
  }

  schedule(cron: string, callback: (...args: any[]) => any) {
    const job = scheduleJob(cron, callback);

    this.jobs.push(job);
    return this;
  }

  parse(raw_message: string) {
    for (const command of this.commands) {
      if (command.isMatched(raw_message)) {
        this.args = command.parseArgs(raw_message);
        this.runMatchedCommand(command);
        break;
      }
    }
  }

  help() {
    let message = `Commands:`;
    const commands_length = this.commands.length;

    for (let i = 0; i < commands_length; i++) {
      const { raw_name, desc } = this.commands[i];
      message += `\n  ${raw_name}  ${desc}`;
    }

    this.event.reply(message);
  }

  bindBot(bot: Bot) {
    const { uin } = bot;

    if (this.bots.has(uin)) {
      throw new Error('怎么可能会有这种报错？');
    }

    this.listenOnline(bot);
    this.listenOffline(bot);
    this.listenMessage(bot);
    this.bots.set(bot.uin, bot);
  }

  getBot() {
    const { self_id } = this.event;
    return this.bots.get(self_id)!;
  }

  getLevel() {
    const self_id = this.event.self_id;
    const bot = this.bots.get(self_id)!;
    const level = bot.getUserLevel(this.event);
    return level;
  }

  private runMatchedCommand(command: Command) {
    if (!command.func) return;
    command.func(...this.args);
  }

  private listenOnline(bot: Bot) {
    bot.on('system.online', () => {
      bot.sendMasterMsg('该账号刚刚从掉线中恢复，现在一切正常');
      bot.logger.info(`${bot.nickname} 刚刚从掉线中恢复，现在一切正常`);
    });
  }

  private listenOffline(bot: Bot) {
    bot.on('system.offline', (event: { message: string }) => {
      bot.logger.info(`${bot.nickname} 已离线，${event.message}`);
    });
  }

  private listenMessage(bot: Bot) {
    bot.on('message', (event: AllMessageEvent) => {
      this.event = event;
      this.parse(event.raw_message);
    });
  }
}

export const extension = new Extension();

extension
  .command('print <message>')
  .description('打印输出信息，一般用作测试')
  .sugar(/^(打印|输出)\s?(?<message>.+)$/)
  .action(function (message: string) {
    this.event.reply(message);
  });

extension
  .command('login <uin>', ['private'])
  .description('添加登录新的 qq 账号，默认在项目启动时自动登录')
  .sugar(/^(登录|登陆)\s?(?<uin>[1-9][0-9]{4,11})$/)
  .action(function (uin: number) {
    const bot = this.getBot();
    const level = this.getLevel();

    if (level < 5) {
      return this.event.reply('权限不足');
    }
    addBot.call(bot, uin, <PrivateMessageEvent>this.event);
  });

extension
  .command('restart')
  .description('重启进程')
  .sugar(/^重启$/)
  .action(function () {
    const level = this.getLevel();

    if (level < 5) {
      return this.event.reply('权限不足');
    }
    setTimeout(() => {
      spawn(
        process.argv.shift()!,
        process.argv,
        {
          cwd: __workname,
          detached: true,
          stdio: 'inherit',
        }
      ).unref();
      process.exit(0);
    }, 1000);

    this.event.reply('またね♪');
  });

extension
  .command('shutdown')
  .description('结束进程')
  .sugar(/^关机$/)
  .action(function () {
    const level = this.getLevel();

    if (level < 5) {
      return this.event.reply('权限不足');
    }
    setTimeout(() => process.exit(0), 1000);
    this.event.reply('お休み♪');
  });
