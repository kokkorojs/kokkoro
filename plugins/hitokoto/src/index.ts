import { useCommand, useLogger } from '@kokkoro/core';

import { fetchSentence, HITOKOTO_API, resolveTypeCodes } from './service';

const logger = useLogger();

export default () => {
  useCommand('/一言 [types]...', async context => {
    const payload = { c: resolveTypeCodes(context.args.types) };

    logger.debug('发送 Hitokoto 请求', {
      method: 'GET',
      url: HITOKOTO_API,
      payload,
    });

    const sentence = await fetchSentence(payload.c);
    const { from, hitokoto, id, type } = sentence;

    logger.debug('收到 Hitokoto 响应', sentence);
    logger.info('已获取一言', { id, type });

    return `『${hitokoto}』——「${from}」`;
  }).shortcut(/^来点(?<types>.+)?骚话$/);
};
