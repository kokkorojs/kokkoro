import { spawn } from 'child_process';
import { cyan } from '@/utils/color.js';
import { ERROR } from '@/utils/prefix.js';
import { hasConfig } from '@/utils/file.js';

export interface Options {
  develop: boolean;
}

export default async (options: Options): Promise<void> => {
  const has_config = hasConfig();

  if (!has_config) {
    const file = cyan('kokkoro.json');
    const command = cyan('kokkoro init');

    console.error(`${ERROR} config file ${file} is not exists.`);
    console.error(`${ERROR} If you want to create the file, please use ${command} command.\n`);
    process.exit(1);
  }
  const { develop } = options;
  const node = spawn('node', ['index.js'], {
    stdio: 'inherit',
    env: {
      KOKKORO_DEVELOP: develop ? 'open' : 'close',
    },
  });

  node.stdout?.on('data', data => console.log(data.toString()));
  node.stderr?.on('data', data => console.error(data.toString()));
  node.on('close', code => console.log(`child process exited with code ${code}.\n`));
};
