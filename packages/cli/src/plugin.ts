import ora from 'ora';
import { Command } from 'commander';
import prompts, { PromptObject } from 'prompts';
import { join } from 'node:path';
import { exit } from 'node:process';
import { cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { colorful } from '@kokkoro/utils';
import { ERROR, INFO, config_path, plugins_path } from '@/index.js';

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

export default function (program: Command) {
  program
    .command('plugin <name>')
    .description('generate a kokkoro plugin project')
    .action(async name => {
      if (!existsSync(config_path)) {
        console.error(
          `${ERROR}: config file is not exists. If you want to create the file, use ${colorful(
            'Cyan',
            'kokkoro init',
          )}.\n`,
        );
        exit(1);
      }

      try {
        const response = await prompts(questions, {
          onCancel() {
            console.log(`${INFO}: plugin module creation has been aborted.\n`);
            exit(0);
          },
        });
        const { style } = response;
        const module_path = join(plugins_path, name);

        if (existsSync(module_path)) {
          console.warn(`${ERROR}: plugin directory already exists.\n`);
          exit(1);
        }
        const url = join(import.meta.url, `../../template/${style}`);
        const path = fileURLToPath(url);

        await cp(path, module_path, {
          recursive: true,
        });
        const command = `cd ./plugins/${name} && npm pkg set name="${name}"`;
        const spinner = ora(`Initialize ${name} package.json`).start();

        try {
          await promiseExec(command);
          spinner.succeed();
        } catch (error) {
          spinner.fail();
        }
        console.log(`${INFO}: plugin module create successful.\n`);
      } catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);

        console.warn(`\n${ERROR}: ${message}.`);
        exit(1);
      }
    });
}
