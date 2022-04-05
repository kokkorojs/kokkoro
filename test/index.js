const { exec } = require('child_process');
const { asString } = require('date-format');

const { logger } = require('../lib');

class Puppet {
  constructor(uin) {
    this.uin = uin;
  }

  // TODO ⎛⎝≥⏝⏝≤⎛⎝ 伪造消息段
  // const event = {
  //   raw_message: '',
  // }
}

const puppet = new Puppet(1145141919);

process.stdin.setEncoding('utf8');

function listenInput() {
  const current_date = asString(new Date());
  const log_prefix = colors.cyan(`[${current_date}] [DEBUG] [kokkoro:notify] - `);

  process.stdout.write(log_prefix);
  process.stdin.once('data', (input) => {
    const command = input.trim();

    switch (command) {
      case 'exit':
        process.exit();
        break;
      default:
        return listenInput();
        break;
    }
  })
}

logger.debug('欢迎使用 kokkoro，你可以利用本程序进行开发调试 d(･∀･*)♪ﾟ');
listenInput();
