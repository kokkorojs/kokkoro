import { useCommand } from '@kokkoro/core';

interface CrazyThursday {
  readonly success: boolean;
  readonly message: string;
  readonly text: string;
}

const KFC_API = new URL('https://kfc.yuki.sh');

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

async function getCrazyThursday() {
  const response = await fetch(KFC_API);

  if (!response.ok) {
    throw new Error(`接口请求失败，状态码 ${response.status}`);
  }
  const { success, message, text } = <CrazyThursday>await response.json();

  return success ? text : message;
}

function shouldTrigger(content: string) {
  if (KEYWORDS.some(pattern => pattern.test(content))) {
    return true;
  }
  return WEEKDAY_FORMAT.format(new Date()) === 'Thursday' && BURGER_BRANDS.test(content);
}

export default () => {
  useCommand('/疯狂星期四', context => {
    if (shouldTrigger(context.content)) {
      return getCrazyThursday();
    }
  }).shortcut(SHORTCUT);
};
