import { program } from 'commander';
import { fileURLToPath } from 'node:url';
import { getVersion } from '@/utils/file.js';
import { init, plugin, start } from '@/actions/index.js';

export const working = process.cwd();
export const root = fileURLToPath(new URL('..', import.meta.url));

const version = await getVersion();

program.command('init').description('initialize project file').action(init);

program.command('plugin <name>').description('generate a plugin template').action(plugin);

program
  .command('start')
  .description('startup project')
  .option('-d, --develop', 'open develop mode', false)
  .action(start);

program.name('kokkoro').version(version, '-v, --version').parse();
