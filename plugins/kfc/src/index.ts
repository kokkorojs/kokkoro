import { useCommand } from '@kokkoro/core';

interface CrazyThursday {
  readonly success: boolean;
  readonly message: string;
  readonly text: string;
}

const KFC_API = new URL('https://kfc.yuki.sh');

export default () => {
  useCommand('/疯狂星期四', async () => {
    const response = await fetch(KFC_API);

    if (!response.ok) {
      throw new Error(`接口请求失败，状态码 ${response.status}`);
    }
    const { success, message, text } = <CrazyThursday>await response.json();

    return success ? text : message;
  })
    .shortcut(/(?:vivo|[v微]\s*(?:我|me)?)\s*(?:50|五十)/i)
    .shortcut(/(?:肯德基|kfc)/i)
    .shortcut(/(?:周四|星期四|木曜日|thursday)/i);
};
