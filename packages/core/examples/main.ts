import { Bot } from '@kokkoro/core';

import Echo from './plugins/echo';
import Terminal from './plugins/terminal';

const { APP_ID: appId, CLIENT_SECRET: clientSecret } = import.meta.env;

if (!appId || !clientSecret) {
  throw new Error('APP_ID and CLIENT_SECRET are required');
}
const bot = new Bot({
  appId,
  clientSecret,
});

await bot.mount(Echo);
await bot.mount(Terminal);
await bot.online();
