import { $, file, Glob, write } from 'bun';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

import { type InputOptions, input, select } from 'komut/prompts';

type Protocol = 'websocket' | 'webhook';

// prettier-ignore
const MAIN = [
  "import { run } from 'kokkoro';",
  '',
  'await run();',
  '',
].join('\n');

const PLUGIN = [
  "import { useCommand } from '@kokkoro/core';",
  '',
  'export default () => {',
  "  useCommand('/ping', () => 'pong');",
  '};',
  '',
].join('\n');

async function hasEntries(directory: string): Promise<boolean> {
  if (!existsSync(directory)) {
    return false;
  }
  const entries = new Glob('*').scan({
    cwd: directory,
    dot: true,
    onlyFiles: false,
  });
  const { done } = await entries.next();

  return !done;
}

function prompt(message: string, options?: InputOptions): string {
  const value = input(message, options);

  if (value === null) {
    throw new Error('已取消创建项目');
  }
  return value;
}

function promptRequired(message: string): string {
  return prompt(message, {
    validate: value => value.length > 0 || `${message}不能为空`,
  });
}

function promptPort(): number {
  const value = prompt('服务端口', {
    default: '3000',
    validate: value => {
      const port = Number(value);

      return (Number.isInteger(port) && port >= 0 && port <= 65535) || '服务端口必须是 0 到 65535 之间的整数';
    },
  });

  return Number(value);
}

function promptProtocol(): Protocol {
  const choice = select('QQ 服务接入方式', [
    { label: 'WebSocket', value: 'websocket' },
    { label: 'WebHook', value: 'webhook' },
  ]);

  if (choice === null) {
    throw new Error('已取消创建项目');
  }
  return <Protocol>choice.value;
}

function promptWebHookPath(): string {
  return prompt('WebHook 路径', {
    default: '/callback',
    validate: value => value.startsWith('/') || 'WebHook 路径必须以 / 开头',
  });
}

function promptBots(protocol: Protocol) {
  const choice = select('是否添加机器人', [
    { label: '是', value: 'yes' },
    { label: '否', value: 'no' },
  ]);

  if (choice === null) {
    throw new Error('已取消创建项目');
  }

  if (choice.value === 'no') {
    return [];
  }
  const bot = {
    appId: promptRequired('机器人 AppID'),
    clientSecret: promptRequired('机器人 ClientSecret'),
  };

  return protocol === 'webhook' ? [{ ...bot, webhook: { path: promptWebHookPath() } }] : [bot];
}

/** 在指定目录创建 Kokkoro 项目。 */
export async function createProject(directory: string, isForced = false): Promise<void> {
  if (!isForced && (await hasEntries(directory))) {
    throw new Error(`目标目录不是空目录，如需继续，请使用 --force 选项覆盖模板文件\n${directory}`);
  }
  const port = promptPort();
  const protocol = promptProtocol();
  const bots = promptBots(protocol);
  const name = basename(resolve(directory));
  const manifest = {
    name,
    private: true,
    type: 'module',
    workspaces: ['plugins/*'],
    scripts: {
      start: 'bun run main.ts',
    },
    dependencies: {
      kokkoro: '^3.0.3',
    },
    peerDependencies: {
      typescript: '^6.0.3',
    },
    devEngines: {
      runtime: {
        name: 'bun',
        onFail: 'warn',
      },
      packageManager: {
        name: 'bun',
        onFail: 'warn',
      },
    },
  };
  const config = {
    $schema: 'https://kokkoro.js.org/schema.json',
    protocol,
    server: { port },
    bots,
  };
  const pluginsDirectory = join(directory, 'plugins');

  await mkdir(pluginsDirectory, { recursive: true });
  await Promise.all([
    write(join(directory, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    write(join(directory, 'kokkoro.json'), `${JSON.stringify(config, null, 2)}\n`),
    write(join(directory, 'main.ts'), MAIN),
  ]);

  console.log('\n项目创建完成，请依次运行以下命令：\n');

  if (directory !== '.') {
    console.log(`  cd ${$.escape(resolve(directory))}`);
  }
  console.log('  bun install');
  console.log('  bun start');
}

/** 在当前 Kokkoro 项目中创建本地插件。 */
export async function createPlugin(name: string, isForced = false): Promise<void> {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) {
    throw new Error('插件名称必须以小写字母开头，且只能包含小写字母、数字和连字符');
  }

  if (!(await file('kokkoro.json').exists())) {
    throw new Error('当前目录不是 Kokkoro 项目，请先运行 init 命令');
  }
  const destination = join('plugins', name);

  if (!isForced && (await hasEntries(destination))) {
    throw new Error(`目标插件目录不是空目录，如需继续，请使用 --force 选项覆盖模板文件\n${destination}`);
  }
  const source = join(destination, 'src');
  const manifest = {
    name: `kokkoro-plugin-${name}`,
    version: '0.0.0',
    type: 'module',
    files: ['src'],
    exports: './src/index.ts',
    peerDependencies: {
      '@kokkoro/core': '^3.1.5',
      typescript: '^6.0.3',
    },
  };

  await Promise.all([
    write(join(destination, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    write(join(source, 'index.ts'), PLUGIN),
  ]);

  console.log(`插件 ${name} 创建完成，请运行 bun i 同步工作区依赖`);
}
