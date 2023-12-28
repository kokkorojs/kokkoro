import { Command } from 'commander';
import { exit } from 'node:process';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { colorful } from '@kokkoro/utils';
import { ERROR, INFO, config_path } from '@/index.js';

export default function (program: Command) {
  program
    .command('start')
    .description('kokkoro bot startup')
    .option('-d, --develop develop mode')
    .action(option => {
      if (!existsSync(config_path)) {
        console.error(
          `${ERROR}: config file is not exists. If you want to create the file, use ${colorful(
            'Cyan',
            'kokkoro init',
          )}.\n`,
        );
        exit(1);
      }
      const { develop } = option;
      const node = spawn('node', ['--experimental-import-meta-resolve', 'app.js'], {
        stdio: 'inherit',
        env: {
          KOKKORO_DEVELOP: develop ? 'open' : 'close',
        },
      });

      node.stdout?.on('data', data => console.log(data.toString()));
      node.stderr?.on('data', data => console.error(data.toString()));
      node.on('close', code => console.log(`${INFO}: child process exited with code ${code}.\n`));
    });
}
