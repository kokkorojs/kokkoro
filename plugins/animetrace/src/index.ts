import { useCommand, useLogger } from '@kokkoro/core';

import { ANIMETRACE_API, fetchCharacters } from './service';
import { createMarkdown } from './util';

const logger = useLogger();

export default () => {
  useCommand('/搜角色', async context => {
    const image = context.attachments?.find(attachment => attachment.content_type?.startsWith('image/'));

    if (!image?.url) {
      throw new Error('请在指令中附带需要识别的图片');
    }
    logger.debug('发送 AnimeTrace 请求', {
      method: 'POST',
      url: ANIMETRACE_API,
      payload: { url: image.url, is_multi: 1, ai_detect: 0 },
    });

    const result = await fetchCharacters(image.url);

    logger.debug('收到 AnimeTrace 响应', result);
    logger.info('已识别图片中的角色', { count: result.data.length, trace_id: result.trace_id });

    await context.reply({
      msg_type: 2,
      markdown: { content: createMarkdown(result.data) },
    });
  }).shortcut('搜角色');
};
