import { stringToNumber } from '@kokkoro/utils';
import { CommandContext, Metadata, useCommand } from '@kokkoro/core';
import { closeAircon, getTemp, openAircon, setTemp } from './service.js';

function parseId(ctx: CommandContext) {
  if (ctx.t === 'AT_MESSAGE_CREATE') {
    return ctx.guild_id;
  } else {
    return ctx.group_openid;
  }
}

export const metadata: Metadata = {
  name: 'aircon',
  description: '群空调',
};

export default function Aircon() {
  useCommand('/开空调', async ctx => {
    const id = parseId(ctx);
    return await openAircon(id);
  });
  useCommand('/关空调', async ctx => {
    const id = parseId(ctx);
    return await closeAircon(id);
  });
  useCommand('/温度', async ctx => {
    const id = parseId(ctx);
    return await getTemp(id);
  });
  useCommand<{ temp: string }>('/设置温度 <temp>', async ctx => {
    const id = parseId(ctx);
    const temp = stringToNumber(ctx.query.temp);

    return await setTemp(id, temp);
  });
}
