import { Glob, write } from 'bun';
import { mkdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

import { input, select } from 'komut/prompts';

type Protocol = 'websocket' | 'webhook';

async function hasEntries(directory: string): Promise<boolean> {
  try {
    const entries = new Glob('*').scan({
      cwd: directory,
      dot: true,
      onlyFiles: false,
    });
    const iterator = entries[Symbol.asyncIterator]();
    const { done } = await iterator.next();

    return !done;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function prompt(message: string, defaultValue?: string): string {
  const value = input(message, { default: defaultValue });

  if (value === null) {
    throw new Error('已取消创建项目。');
  }
  return value;
}

function promptRequired(message: string): string {
  while (true) {
    const value = prompt(message);

    if (value) {
      return value;
    }
    console.error(`${message}不能为空。`);
  }
}

function promptPort(): number {
  while (true) {
    const port = Number(prompt('服务端口', '3000'));

    if (Number.isInteger(port) && port >= 0 && port <= 65535) {
      return port;
    }
    console.error('服务端口必须是 0 到 65535 之间的整数。');
  }
}

function promptProtocol(): Protocol {
  const choice = select('QQ 服务接入方式', [
    { label: 'WebSocket', value: 'websocket' },
    { label: 'WebHook', value: 'webhook' },
  ]);

  if (choice === null) {
    throw new Error('已取消创建项目。');
  }
  return <Protocol>choice.value;
}

function promptWebHookPath(): string {
  while (true) {
    const path = prompt('WebHook 路径', '/callback');

    if (path.startsWith('/')) {
      return path;
    }
    console.error('WebHook 路径必须以 / 开头。');
  }
}

function promptBots(protocol: Protocol) {
  const choice = select('是否添加机器人', [
    { label: '是', value: 'yes' },
    { label: '否', value: 'no' },
  ]);

  if (choice === null) {
    throw new Error('已取消创建项目。');
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
  if ((await hasEntries(directory)) && !isForced) {
    throw new Error(`目标目录不是空目录。如需继续，请使用 --force 选项覆盖模板文件。\n${directory}`);
  }
  const port = promptPort();
  const protocol = promptProtocol();
  const bots = promptBots(protocol);
  const name = basename(resolve(directory));
  const manifest = {
    name,
    private: true,
    type: 'module',
    scripts: {
      start: 'bun run main.ts',
    },
    dependencies: {
      kokkoro: '^3.0.0',
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
    write(join(directory, 'main.ts'), "import { run } from 'kokkoro';\n\nawait run();\n"),
  ]);

  console.log('\n项目创建完成，请依次运行以下命令：\n');

  if (directory !== '.') {
    console.log(`  cd ${directory}`);
  }
  console.log('  bun install');
  console.log('  bun start');
}
