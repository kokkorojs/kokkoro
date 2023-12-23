import { Metadata, useCommand } from '@kokkoro/core';

interface Result {
  success: boolean;
  text: string;
  message: string;
}

export const metadata: Metadata = {
  name: 'kfc',
  description: 'vivo 50',
};

export default function KentuckyFriedChicken() {
  useCommand('/疯狂星期四', async ctx => {
    const { data } = await ctx.bot.request.get<Result>('https://kfc.yuki.sh');
    const { success, message, text } = data;

    return success ? text : message;
  });
}
