import { type Bot, useCommand, useLogger } from '@kokkoro/core';

import { fetchImageUrl } from './service';

const logger = useLogger();

export default (bot: Bot) => {
  useCommand('/og <url>', async context => {
    const { url } = context.args;

    try {
      logger.debug('发送网页请求', { method: 'GET', url });

      const imageUrl = await fetchImageUrl(url);

      if (!imageUrl) {
        throw new Error('未能获取 Open Graph 预览图片');
      }
      logger.debug('已解析 Open Graph 预览图片地址', { url, imageUrl });

      const payload = { msg_id: context.id };

      if ('group_openid' in context) {
        await bot.sendGroupImage(context.group_openid, imageUrl, payload);
      } else {
        await bot.sendUserImage(context.author.user_openid, imageUrl, payload);
      }
      logger.info('已发送 Open Graph 预览图片', { url, imageUrl });
    } catch (error) {
      if (context.trigger === 'command') {
        throw error;
      }
    }
  }).shortcut(/^(?<url>https?:\/\/\S+)\s*$/iu);
};
