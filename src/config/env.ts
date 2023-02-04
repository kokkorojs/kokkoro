import { join } from 'path';
import { watch } from 'chokidar';
import { config, DotenvConfigOptions } from 'dotenv';
import { logger } from '@/kokkoro';

const env_path = join(__workname, '.env');

function refreshEnv(): void {
  const option: DotenvConfigOptions = {
    override: true,
  };

  config(option);
}

watch(env_path).on('change', async () => {
  setTimeout(() => {
    refreshEnv();
    logger.info('.env 已热更');
  });
});
config();
