import { useCommand, useLogger } from '@kokkoro/core';

import { fetchImageSources } from './service';
import { createMarkdown } from './util';

const logger = useLogger();

export default () => {
  useCommand('/搜图', async context => {
    const [reference] = context.msg_elements ?? [];
    const attachments = context.message_type === 103 ? reference?.attachments : context.attachments;
    const images = attachments?.filter(attachment => attachment.content_type?.startsWith('image/')) ?? [];
    const [image] = images;

    if (!image?.url) {
      throw new Error('未检测到图片，请在指令消息中附带图片，或引用包含图片的消息后重试。');
    }
    const result = await fetchImageSources(image.url, logger);
    const { results } = result;
    const notice = images.length > 1 ? '检测到消息中包含多张图片，已选取首张图片进行识别。' : undefined;

    logger.info('已找到图片来源', { count: results.length });

    await context.reply({
      msg_type: 2,
      markdown: {
        content: await createMarkdown(results, notice),
      },
    });
  }).shortcut('搜图');
};
