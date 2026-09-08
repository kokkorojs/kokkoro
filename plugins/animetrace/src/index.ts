import { useCommand, useLogger } from '@kokkoro/core';

import { fetchCharacters } from './service';
import { createMarkdown } from './util';

const logger = useLogger();

export default () => {
  useCommand('/搜角色', async context => {
    const image = context.attachments?.find(attachment => attachment.content_type?.startsWith('image/'));

    if (!image?.url) {
      throw new Error('请在指令中附带需要识别的图片');
    }
    const result = await fetchCharacters(image.url, logger);
    const { data, trace_id } = result;

    logger.info('已识别图片中的角色', { count: data.length, trace_id });

    await context.reply({
      msg_type: 2,
      markdown: { content: createMarkdown(data) },
    });
  }).shortcut('搜角色');
};
