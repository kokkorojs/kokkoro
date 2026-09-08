import { useCommand, useLogger } from '@kokkoro/core';

import { fetchSentence, resolveTypeCodes } from './service';

const logger = useLogger();

export default () => {
  useCommand('/一言 [types]...', async context => {
    const types = resolveTypeCodes(context.args.types);
    const sentence = await fetchSentence(types, logger);
    const { from, hitokoto, id, type } = sentence;

    logger.info('已获取一言', { id, type });

    return `『${hitokoto}』——「${from}」`;
  }).shortcut(/^来点(?<types>.+)?骚话$/);
};
