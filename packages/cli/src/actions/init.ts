import type { BotConfig } from '@kokkoro/core';

import enquirer from 'enquirer';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { root, working } from '@/index.js';
import { cyan } from '@/utils/color.js';
import { INFO, SUCCESS } from '@/utils/prefix.js';

interface Params {
  name: string;
  appid: string;
  token: string;
  secret: string;
  is_public: boolean;
}

type Events = BotConfig['events'];
type Bot = Omit<BotConfig, 'events'>;

interface Config {
  server: {
    port: number;
    domain: string;
  };
  log_level: string;
  events: Events;
  bots: Bot[];
}

function required(value: string): boolean | string {
  if (!value.trim()) {
    return 'Cannot be empty!';
  }
  return true;
}

async function generateProject({ name }: Params): Promise<void> {
  const workspace = join(working, name);
  const template = join(root, 'templates/base');
  const exist = existsSync(workspace);
  const folder = cyan(workspace);

  console.log(`\nInitializing project ${folder}...\n`);

  if (!exist) {
    await mkdir(workspace);
  }
  await cp(template, workspace, {
    recursive: true,
  });
}

async function updatePackage({ name }: Params): Promise<void> {
  await promisify(exec)(`cd ./${name} && npm pkg set name="${name}"`);

  console.log(`${SUCCESS} Project initialization completed.`);
  console.log(`${SUCCESS} You can execute the following commands:\n`);
  console.log(cyan(`  cd ${name}`));
  console.log(cyan('  npm install'));
  console.log(cyan('  npm run start\n'));
}

async function updateConfig({ name, is_public, appid, token, secret }: Params): Promise<void> {
  const path = join(working, name, 'kokkoro.json');
  const text = await readFile(path, 'utf-8');

  const config = <Config>JSON.parse(text);
  const events: Events = is_public ? ['PUBLIC_GUILD_MESSAGES'] : ['PUBLIC_GUILD_MESSAGES', 'GUILD_MESSAGES'];
  const bot: Bot = { appid, token, secret };

  config.events = events;
  config.bots.push(bot);

  const data = JSON.stringify(config, null, 2);
  await writeFile(path, data);
}

export default async (): Promise<void> => {
  const params = await enquirer
    .prompt<Params>([
      {
        type: 'input',
        name: 'name',
        message: 'Please enter the project name:',
        initial: 'robot',
        validate: required,
      },
      {
        type: 'input',
        name: 'appid',
        message: 'Your robot appid:',
        validate: required,
      },
      {
        type: 'input',
        name: 'token',
        message: 'Your robot token:',
        validate: required,
      },
      {
        type: 'input',
        name: 'secret',
        message: 'Your robot secret:',
        validate: required,
      },
      {
        type: 'confirm',
        name: 'is_public',
        message: 'Is it a public domain robot?',
      },
    ])
    .catch(() => {
      console.log(`\n${INFO} Project initialization has been aborted.\n`);
      process.exit(1);
    });

  await generateProject(params);
  await updateConfig(params);
  await updatePackage(params);
};
