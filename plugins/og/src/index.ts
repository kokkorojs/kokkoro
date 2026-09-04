import { type Bot, type CommandContext, useCommand, useLogger } from '@kokkoro/core';

import { fetchImageUrl } from './service';
import { parseUrl } from './util';

const logger = useLogger();
const URL_SHORTCUT =
  /^(?!.*https?:\/\/.*https?:\/\/).*?(?<url>https?:\/\/[^\s<>"'`，。！？；：、（）【】《》「」『』]+).*$/isu;

async function sendPreviewImage(bot: Bot, context: CommandContext<{ readonly url: string }>): Promise<void> {
  const url = parseUrl(context.args.url);

  if (!url) {
    throw new Error('链接格式无效');
  }
  logger.debug('发送网页请求', { method: 'GET', url: url.href });

  const imageUrl = await fetchImageUrl(url);

  if (!imageUrl) {
    throw new Error('未能获取 Open Graph 预览图片');
  }
  logger.debug('已解析 Open Graph 预览图片地址', { url: url.href, imageUrl });

  const payload = { msg_id: context.id };

  if ('group_openid' in context) {
    await bot.sendGroupImage(context.group_openid, imageUrl, payload);
  } else {
    await bot.sendUserImage(context.author.user_openid, imageUrl, payload);
  }
  logger.info('已发送 Open Graph 预览图片', { url: url.href, imageUrl });
}

export default (bot: Bot) => {
  useCommand('/og <url>', async context => {
    try {
      await sendPreviewImage(bot, context);
    } catch (error) {
      if (context.trigger === 'command') {
        throw error;
      }
    }
  }).shortcut(URL_SHORTCUT);
};
