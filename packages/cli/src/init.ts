import { exit } from 'node:process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { exec } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import ora from 'ora';
import { Command } from 'commander';
import prompts, { PromptObject } from 'prompts';
import { colorful } from '@kokkoro/utils';
import { ERROR, INFO, SUCCESS, WARN, config_path, plugins_path } from '@/index.js';

const questions: PromptObject[] = [
  {
    type: 'text',
    name: 'appid',
    message: 'Your bot appid',
  },
  {
    type: 'text',
    name: 'token',
    message: 'Your bot token',
  },
  {
    type: 'text',
    name: 'secret',
    message: 'Your bot secret',
  },
  {
    type: 'confirm',
    name: 'is_public',
    message: 'Is it a public domain robot?',
  },
  {
    type: 'number',
    name: 'port',
    message: 'Kokkoro serve port',
    initial: 2333,
    min: 1,
    max: 65535,
  },
  {
    type: 'select',
    name: 'manager',
    message: 'Pick your package manager',
    choices: [
      { title: 'npm', value: 'npm' },
      { title: 'yarn', value: 'yarn' },
      { title: 'pnpm', value: 'pnpm' },
    ],
  },
];
const app_template = `import { setup } from 'kokkoro';\n\nsetup();\n`;

export default function (program: Command) {
  program
    .command('init')
    .description('initialize kokkoro config file')
    .option('-f, --forced', 'overwrite config file if it exists')
    .action(async options => {
      if (!options.forced && existsSync(config_path)) {
        console.warn(
          `${ERROR}: config file already exists. If you want to overwrite the current file, use ${colorful(
            'Cyan',
            'kokkoro init -f',
          )}.\n`,
        );
        exit(1);
      }

      const response = await prompts(questions, {
        onCancel() {
          console.log(`${INFO}: config file generation has been aborted.\n`);
          exit();
        },
      });
      const { appid, token, secret, is_public, port, manager } = response;
      const events = is_public ? ['PUBLIC_GUILD_MESSAGES'] : ['PUBLIC_GUILD_MESSAGES', 'GUILD_MESSAGES'];
      const kokkoroConfig = {
        $schema: 'https://kokkoro.js.org/schema.json',
        server: {
          port,
          domain: null,
        },
        events,
        log_level: 'INFO',
        bots: [{ appid, token, secret }],
      };

      try {
        await writeFile(`app.js`, app_template);
        await writeFile(`kokkoro.json`, JSON.stringify(kokkoroConfig, null, 2));

        if (!existsSync(plugins_path)) {
          await mkdir(plugins_path);
        }
        console.log(`${SUCCESS}: created config file ${colorful('Cyan', config_path)}.\n`);
        const promiseExec = promisify(exec);

        await promiseExec('npm init -y && npm pkg set type="module"');

        const modules = ['kokkoro'];
        const modules_length = modules.length;

        let install_success = true;
        let install_message = `${SUCCESS}: project is initialized successfully.\n`;

        for (let i = 0; i < modules_length; i++) {
          const module = modules[i];
          const spinner = ora(`Install ${module}`).start();
          const command = `${manager === 'npm' ? `${manager} i` : `${manager} add`} ${module}`;

          try {
            await promiseExec(command);
            spinner.succeed();
          } catch (error) {
            spinner.fail();

            if (install_success) {
              install_success = false;
              install_message = `${WARN}: npm package was not installed successfully.\n`;
            }
          }
          if (i === modules_length - 1) {
            console.log(install_message);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);

        console.warn(`\n${ERROR}: ${message}.`);
        exit(1);
      }
    });
}
