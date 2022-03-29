const { exec } = require('child_process');
const { asString } = require('date-format');
const { Bot, colors, logger, Extension } = require('../lib');

const setu = new Extension('setu');

setu
  .command('random')
  .description('send random setu')
  .sugar(/^来[点张份][涩瑟色]图$/)
  .action(() => {

  })

setu
  .command('search <...tags>')
  .description('send online setu')
  .sugar(/^来[点张份](.+)[涩瑟色]图$/)
  .action((tags) => {
    console.log(tags);
  })

process.stdin.setEncoding('utf8');

function listenInput() {
  const current_date = asString(new Date());
  const log_prefix = colors.cyan(`[${current_date}] [DEBUG] [kokkoro log] - `);

  process.stdout.write(log_prefix);
  process.stdin.once('data', (input) => {
    const command = input.trim();

    switch (command) {
      case 'exit':
        process.exit();
        break;
      default:
        setu.parse(command);
        return listenInput();
        break;
    }
  })
}

logger.debug('欢迎使用 kokkoro，你可以利用本程序进行开发调试 d(･∀･*)♪ﾟ');
listenInput();
