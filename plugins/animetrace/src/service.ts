import { type Logger } from '@kokkoro/core';

/** AnimeTrace v1 识别接口的请求地址。 */
export const ANIMETRACE_API = 'https://api.animetrace.com/v1/search';

/**
 * AnimeTrace 识别响应。
 *
 * @see https://www.animetrace.com/api-docs/
 */
export interface AnimeTrace {
  /** 状态码，`0` 表示成功。 */
  readonly code: number;
  /** 是否判定为 AI 生成图片。 */
  readonly ai: boolean;
  /** 本次识别的唯一 ID，反馈问题时使用。 */
  readonly trace_id: string;
  /** 检测到的每个人物的结果列表。 */
  readonly data: readonly CharacterResult[];
}

/** AnimeTrace 返回的单个人物识别结果。 */
export interface CharacterResult {
  /** 人物位置 `[x1, y1, x2, y2]`，坐标相对于图片宽高，范围为 0 到 1。 */
  readonly box: readonly [number, number, number, number];
  /** 每个检测框的唯一 ID。 */
  readonly box_id: string;
  /** 置信度较低，候选较多，需人工确认。 */
  readonly not_confident: boolean;
  /** 候选角色列表，越靠前可能性越大。 */
  readonly character: readonly {
    /** 作品名称。 */
    readonly work: string;
    /** 角色名称。 */
    readonly character: string;
  }[];
}

/** 使用 AnimeTrace 默认模型识别图片中的角色，并返回完整的接口响应。 */
export async function fetchCharacters(url: string, logger?: Logger): Promise<AnimeTrace> {
  const payload = { url, is_multi: '1', ai_detect: '0' };
  const form = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    form.set(key, value);
  }
  logger?.debug('发送 AnimeTrace 请求', {
    method: 'POST',
    url: ANIMETRACE_API,
    payload,
  });

  const response = await fetch(ANIMETRACE_API, { method: 'POST', body: form });

  if (!response.ok) {
    throw new Error(`接口请求失败，状态码 ${response.status}`);
  }
  const result = <AnimeTrace>await response.json();

  logger?.debug('收到 AnimeTrace 响应', result);

  if (result.code !== 0) {
    throw new Error(`AnimeTrace 识别失败，状态码 ${result.code}`);
  }

  if (result.data.length === 0) {
    throw new Error('没有识别到角色');
  }
  return result;
}
