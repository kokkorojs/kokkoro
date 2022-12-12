import { config } from 'dotenv';

config();

export function refreshEnv() {
  config({
    override: true,
  });
}
