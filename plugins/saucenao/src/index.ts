import { useCommand, useLogger } from '@kokkoro/core';

import { fetchImageSources, SAUCENAO_API } from './service';
import { createMarkdown } from './util';

const logger = useLogger();

export default () => {
  useCommand('/搜图', async context => {
    const image = context.attachments?.find(attachment => attachment.content_type?.startsWith('image/'));

    if (!image?.url) {
      throw new Error('请在指令中附带需要搜索的图片');
    }
    logger.debug('发送 SauceNAO 请求', {
      method: 'POST',
      url: SAUCENAO_API,
      payload: { url: image.url },
    });

    const result = await fetchImageSources(image.url);
    const { results } = result;

    logger.debug('收到 SauceNAO 响应', result);
    logger.info('已找到图片来源', { count: results.length });

    await context.reply({
      msg_type: 2,
      markdown: {
        content: await createMarkdown(results),
      },
    });
  }).shortcut('搜图');
};
