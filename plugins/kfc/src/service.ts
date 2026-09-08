import { type Logger } from '@kokkoro/core';

export interface CrazyThursday {
  readonly success: boolean;
  readonly message: string;
  readonly text: string;
}

export const KFC_API = 'https://kfc.yuki.sh';

/**
 * 请求随机的疯狂星期四文案，并返回完整的接口响应。
 *
 * @param logger - 在 debug 日志中记录请求地址和完整接口响应。
 */
export async function fetchCrazyThursday(logger?: Logger): Promise<CrazyThursday> {
  logger?.debug('发送疯狂星期四请求', { method: 'GET', url: KFC_API });

  const response = await fetch(KFC_API);

  if (!response.ok) {
    throw new Error(`接口请求失败，状态码 ${response.status}`);
  }
  const result = <CrazyThursday>await response.json();

  logger?.debug('收到疯狂星期四响应', result);

  return result;
}
