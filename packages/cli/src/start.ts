import { Command } from 'commander';
import { exit } from 'node:process';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

import { colors, config_path, TIP_ERROR, TIP_INFO } from '@/index.js';

export default function (program: Command) {
  program
    .command('start')
    .description('kokkoro bot startup')
    .option('-d, --develop develop mode')
    .action(option => {
      if (!existsSync(config_path)) {
        console.error(
          `${TIP_ERROR} config file is not exists. If you want to create the file, use ${colors.cyan(
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
      node.on('close', code => console.log(`${TIP_INFO} child process exited with code ${code}.\n`));
    });
}