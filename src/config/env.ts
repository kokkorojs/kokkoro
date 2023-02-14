import { watch } from 'fs';
import { join } from 'path';
import { config, DotenvConfigOptions } from 'dotenv';
import { logger } from '@/config';

const env_path = join(__workname, '.env');

function refreshEnv(): void {
  const option: DotenvConfigOptions = {
    override: true,
  };

  config(option);
}

watch(env_path, () => {
  refreshEnv();
  logger.info('.env 已热更');
});

config();
