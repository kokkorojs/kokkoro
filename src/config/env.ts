import { config, DotenvConfigOptions } from 'dotenv';

config();

/**
 * 刷新 env
 */
export function refreshEnv(): void {
  const option: DotenvConfigOptions = {
    override: true,
  };

  config(option);
}
