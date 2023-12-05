import ora from 'ora';
import { Command } from 'commander';
import prompts, { PromptObject } from 'prompts';
import { join } from 'node:path';
import { exit } from 'node:process';
import { existsSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

import { colors, config_path, plugins_path, TIP_ERROR, TIP_INFO } from '@/index.js';

const promiseExec = promisify(exec);
const questions: PromptObject[] = [
  {
    type: 'select',
    name: 'style',
    message: 'Which plugin style would you like to use',
    choices: [
      { title: 'Javascript', value: 'javascript' },
      { title: 'Typescript (Hook)', value: 'hook' },
      { title: 'Typescript (Decorator)', value: 'decorator' },
    ],
  },
];
const onCancel = () => {
  console.log(`${TIP_INFO} plugin module creation has been aborted.\n`);
  exit(0);
};

export default function (program: Command) {
  program
    .command('create <name>')
    .description('create a kokkoro plugin project')
    .action(async name => {
      if (!existsSync(config_path)) {
        console.error(
          `${TIP_ERROR} config file is not exists. If you want to create the file, use ${colors.cyan(
            'kokkoro init',
          )}.\n`,
        );
        exit(1);
      }

      try {
        const response = await prompts(questions, { onCancel });
        const { style } = response;
        const module_path = join(plugins_path, name);

        if (existsSync(module_path)) {
          console.warn(`${TIP_ERROR} plugin directory already exists.\n`);
          exit(1);
        }
        const url = join(import.meta.url, `../../template/${style}`);
        const path = fileURLToPath(url);

        await cp(path, module_path, {
          recursive: true,
        });
        const command = `cd ./plugins/${name} && npm init -y && npm pkg set type="module"`;
        const spinner = ora(`Initialize ${name} package.json`).start();

        try {
          await promiseExec(command);
          spinner.succeed();
        } catch (error) {
          spinner.fail();
        }
        console.log(`${TIP_INFO} plugin module create successful.\n`);
      } catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);

        console.warn(`\n${TIP_ERROR} ${message}.`);
        exit(1);
      }
    });
}
