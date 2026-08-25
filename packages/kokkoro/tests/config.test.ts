import { expect, test } from 'bun:test';

import { loadConfig } from '../src/config';

test('加载配置', async () => {
  const config = await loadConfig(`${import.meta.dir}/fixtures/config.json`);

  expect(config).toEqual({
    server: { port: 0 },
    logger: { level: 'info' },
    bots: [
      { appId: 'APP_ID', clientSecret: 'CLIENT_SECRET', protocol: 'websocket' },
      {
        appId: 'SECOND_APP_ID',
        clientSecret: 'SECOND_CLIENT_SECRET',
        protocol: 'webhook',
        webhook: { path: '/webhook' },
      },
    ],
  });
});
