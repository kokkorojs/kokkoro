import { Bot } from '@kokkoro/core';

const { APP_ID: appId, CLIENT_SECRET: clientSecret } = import.meta.env;

if (!appId || !clientSecret) {
  throw new Error('APP_ID and CLIENT_SECRET are required');
}
const bot = new Bot({
  appId,
  clientSecret,
});

await bot.mount(() => import('./plugins/echo'));
await bot.mount(() => import('./plugins/terminal'));
await bot.online();
