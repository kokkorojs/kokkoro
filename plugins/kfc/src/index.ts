import { useCommand, useLogger } from '@kokkoro/core';

import { fetchCrazyThursday, KFC_API } from './service';

const logger = useLogger();

const PAYMENT = /(?:vivo|[v微]\s*(?:我|me)?)\s*(?:50|五十)/i;
const KFC = /(?:肯德基|kfc)/i;
const THURSDAY = /(?:周四|星期四|木曜日|thursday)/i;
const BURGER_BRANDS = /(?:麦当劳|金拱门|华莱士|汉堡王|德克士|塔斯汀)/i;

const KEYWORDS = [PAYMENT, KFC, THURSDAY];
const SHORTCUT = new RegExp([...KEYWORDS, BURGER_BRANDS].map(pattern => pattern.source).join('|'), 'i');
const WEEKDAY_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Shanghai',
  weekday: 'long',
});

function shouldTrigger(content: string) {
  if (KEYWORDS.some(pattern => pattern.test(content))) {
    return true;
  }
  return WEEKDAY_FORMAT.format(new Date()) === 'Thursday' && BURGER_BRANDS.test(content);
}

export default () => {
  useCommand('/疯狂星期四', async context => {
    if (shouldTrigger(context.content)) {
      logger.debug('发送疯狂星期四请求', { method: 'GET', url: KFC_API });

      const result = await fetchCrazyThursday();

      logger.debug('收到疯狂星期四响应', result);
      logger.info('已获取疯狂星期四文案');

      return result.success ? result.text : result.message;
    }
  }).shortcut(SHORTCUT);
};
