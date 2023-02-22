import { join } from 'path';
import { existsSync, watch, writeFileSync } from 'fs';
import { config, DotenvConfigOptions } from 'dotenv';
import { logger } from './logger';

const env_path = join(__workname, '.env');

function refreshEnv(): void {
  const option: DotenvConfigOptions = {
    override: true,
  };

  config(option);
}

if (!existsSync(env_path)) {
  writeFileSync(env_path, '');
}

watch(env_path, () => {
  refreshEnv();
  logger.info('.env 已热更');
});

config();
