export interface CrazyThursday {
  readonly success: boolean;
  readonly message: string;
  readonly text: string;
}

export const KFC_API = 'https://kfc.yuki.sh';

/** 请求随机的疯狂星期四文案，并返回完整的接口响应。 */
export async function fetchCrazyThursday(): Promise<CrazyThursday> {
  const response = await fetch(KFC_API);

  if (!response.ok) {
    throw new Error(`接口请求失败，状态码 ${response.status}`);
  }
  return <CrazyThursday>await response.json();
}
