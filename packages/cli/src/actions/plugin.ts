import enquirer from 'enquirer';
import { cp } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { root, working } from '@/index.js';
import { cyan } from '@/utils/color.js';
import { hasConfig } from '@/utils/file.js';
import { ERROR, INFO, SUCCESS } from '@/utils/prefix.js';

type Style = 'decorator' | 'hook' | 'javascript';

interface Params {
  style: Style;
}

async function generatePlugin(name: string, style: Style): Promise<void> {
  console.log(style);

  const template = join(root, `templates/${style}`);
  const destination = join(working, 'plugins', name);
  const folder = cyan(destination);

  console.log(`\nCreating plugin ${folder}...\n`);

  await cp(template, destination, {
    recursive: true,
  });
}

async function updatePackage(name: string): Promise<void> {
  await promisify(exec)(`cd ./plugins/${name} && npm pkg set name="${name}"`);
  console.log(`${SUCCESS} Plugin creation completed.\n`);
}

export default async (name: string): Promise<void> => {
  const has_config = hasConfig();

  if (!has_config) {
    const file = cyan('kokkoro.json');
    const command = cyan('kokkoro init');

    console.error(`${ERROR} config file ${file} is not exists.`);
    console.error(`${ERROR} If you want to create the file, please use ${command} command.\n`);
    process.exit(1);
  }
  const { style } = await enquirer
    .prompt<Params>([
      {
        type: 'select',
        name: 'style',
        message: 'Which plugin style would you like to use?',
        choices: [
          { message: 'Javascript', name: 'javascript' },
          { message: 'Typescript (Hook)', name: 'hook' },
          { message: 'Typescript (Decorator)', name: 'decorator' },
        ],
      },
    ])
    .catch(() => {
      console.log(`\n${INFO} Plugin creation has been aborted.\n`);
      process.exit(1);
    });

  await generatePlugin(name, style);
  await updatePackage(name);
};
