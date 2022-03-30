import { Job, scheduleJob } from "node-schedule";
import { Bot, AllMessageEvent } from "./bot";
import { Command, ParsedArgv } from "./command";

export class Extension {
  bot: Bot;
  name: string;
  jobs: Job[];
  commands: Command[];
  event!: AllMessageEvent;
  args: ParsedArgv['args'];

  constructor(bot: Bot) {
    this.bot = bot;
    this.name = '';
    this.args = [];
    this.jobs = [];
    this.commands = [];

    this.bot.on('message', (event: AllMessageEvent) => {
      this.event = event;
      this.parse(event.raw_message);
    })
  }

  command(raw_name: string) {
    const command = new Command(raw_name, this);
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

    return message;
  }

  private runMatchedCommand(command: Command) {
    if (!command.func) return;
    command.func(...this.args);
  }
}

export function initExtension(bot: Bot) {
  const extension = new Extension(bot);

  print(extension);
}

function print(extension: Extension) {
  extension
    .command('print <message>')
    .description('打印输出信息，一般用作测试')
    .sugar(/^(打印|输出)\s?(?<message>.+)$/)
    .action(function (this: Extension, message: string) {
      this.event.reply(message);
    });
}
