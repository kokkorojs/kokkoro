import ora from 'ora';
import { Command } from 'commander';
import prompts, { PromptObject } from 'prompts';
import { exit } from 'node:process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { exec } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { colors, config_path, plugins_path, TIP_ERROR, TIP_INFO, TIP_SUCCESS, TIP_WARN } from '@/index.js';

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
    type: 'number',
    name: 'port',
    message: 'Kokkoro serve port',
    initial: 2333,
    min: 1,
    max: 65535,
  },
  {
    type: 'multiselect',
    name: 'plugins',
    message: 'Select the plugins to install',
    choices: [
      {
        title: 'pcr',
        value: 'kokkoro-plugin-pcr',
        description: '公主连结（我不想打公会战.jpg）',
      },
      {
        title: 'hitokoto',
        value: 'kokkoro-plugin-hitokoto',
        description: '一言语句（才不是网抑云）',
      },
      {
        title: 'aircon',
        value: 'kokkoro-plugin-aircon',
        description: '群空调，低碳环保无污染，就是没风',
        disabled: true,
      },
    ],
    warn: '- 近期重构中，当前插件暂时不可用',
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
const onCancel = () => {
  console.log(`${TIP_INFO} config file generation has been aborted.\n`);
  exit();
};
const app_template = `import { setup } from 'kokkoro';\n\nsetup();\n`;

export default function (program: Command) {
  program
    .command('init')
    .description('initialize kokkoro config file')
    .option('-f, --forced', 'overwrite config file if it exists')
    .action(async options => {
      if (!options.forced && existsSync(config_path)) {
        console.warn(
          `${TIP_ERROR} config file already exists. If you want to overwrite the current file, use ${colors.cyan(
            'kokkoro init -f',
          )}.\n`,
        );
        exit(1);
      }

      const response = await prompts(questions, { onCancel });
      const { appid, token, secret, port, plugins, manager } = response;
      const kokkoroConfig = {
        $schema: 'https://kokkoro.js.org/schema.json',
        server: {
          port,
          domain: null,
        },
        logLevel: 'INFO',
        bots: [{ appid, token, secret }],
      };

      try {
        await writeFile(`app.js`, app_template);
        await writeFile(`kokkoro.json`, JSON.stringify(kokkoroConfig, null, 2));

        if (!existsSync(plugins_path)) {
          await mkdir(plugins_path);
        }
        console.log(`${TIP_SUCCESS} created config file ${colors.cyan(config_path)}.\n`);
        const promiseExec = promisify(exec);

        await promiseExec('npm init -y && npm pkg set type="module"');

        const modules = ['kokkoro', ...plugins];
        const modules_length = modules.length;

        let install_success = true;
        let install_message = `${TIP_SUCCESS} project is initialized successfully.\n`;

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
              install_message = `${TIP_WARN} npm package was not installed successfully.\n`;
            }
          }
          if (i === modules_length - 1) {
            console.log(install_message);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);

        console.warn(`\n${TIP_ERROR} ${message}.`);
        exit(1);
      }
    });
}
