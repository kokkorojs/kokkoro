const { exec } = require('child_process');
const { asString } = require('date-format');
const { Bot, colors, logger } = require('../lib');

process.stdin.setEncoding('utf8');

function listenInput() {
  const current_date = asString(new Date());
  const log_prefix = colors.cyan(`[${current_date}] [DEBUG] [kokkoro log] - `);

  process.stdout.write(log_prefix);
  process.stdin.once('data', (input) => {
    const argv = [...process.argv];
    const command = input.trim().split(' ');

    argv.push(...command);

    switch (argv[2]) {
      case 'exit':
        process.exit();
        break;
      default:
        console.log(argv)
        return listenInput();
        break;
    }
  })
}

logger.debug('欢迎使用 kokkoro，你可以利用本程序进行开发调试 d(･∀･*)♪ﾟ');
listenInput();
