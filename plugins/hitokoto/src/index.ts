import { useCommand } from '@kokkoro/core';

import { fetchSentence, resolveTypeCodes } from './hitokoto';

export * from './hitokoto';

export default () => {
  useCommand('/一言 [types]...', async context => {
    const types = resolveTypeCodes(context.args.types);
    const { from, hitokoto } = await fetchSentence(types);

    return `『${hitokoto}』——「${from}」`;
  }).shortcut(/^来点(?<types>.+)?骚话$/);
};
