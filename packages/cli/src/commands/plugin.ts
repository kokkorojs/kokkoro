import { file, Glob, write } from 'bun';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { Command, Option } from 'komut';

async function hasEntries(directory: string): Promise<boolean> {
  if (!existsSync(directory)) {
    return false;
  }
  const entries = new Glob('*').scan({
    cwd: directory,
    dot: true,
    onlyFiles: false,
  });
  const iterator = entries[Symbol.asyncIterator]();
  const { done } = await iterator.next();

  return !done;
}

const TEMPLATE = [
  "import { useCommand } from '@kokkoro/core';",
  '',
  'export default () => {',
  "  useCommand('/ping', () => 'pong');",
  '};',
  '',
].join('\n');

async function createPlugin(name: string, isForced: boolean): Promise<void> {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) {
    throw new Error('插件名称必须以小写字母开头，且只能包含小写字母、数字和连字符');
  }

  if (!(await file('kokkoro.json').exists())) {
    throw new Error('当前目录不是 Kokkoro 项目，请先运行 init 命令');
  }
  const destination = join('plugins', name);

  if ((await hasEntries(destination)) && !isForced) {
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

  await mkdir(source, { recursive: true });
  await Promise.all([
    write(join(destination, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    write(join(source, 'index.ts'), TEMPLATE),
  ]);

  console.log(`插件 ${name} 创建完成`);
}

@Command({
  name: 'plugin',
  args: '<name>',
  description: 'Create a local plugin template',
})
export default class PluginCommand {
  @Option({ short: 'f', description: 'Overwrite template files in a non-empty plugin directory' })
  public static force = false;

  public constructor(name: string) {
    createPlugin(name, PluginCommand.force);
  }
}
