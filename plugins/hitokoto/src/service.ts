/** 一言 v1 语句接口的请求地址。 */
export const HITOKOTO_API = 'https://v1.hitokoto.cn';

/**
 * 中文句子类型名称与一言接口 `c` 参数值的对应表。
 *
 * @see {@link https://developer.hitokoto.cn/sentence/#请求参数 | 一言语句接口请求参数}
 */
export const TYPE_CODES = {
  动画: 'a',
  漫画: 'b',
  游戏: 'c',
  文学: 'd',
  原创: 'e',
  来自网络: 'f',
  其他: 'g',
  影视: 'h',
  诗词: 'i',
  网易云: 'j',
  哲学: 'k',
  抖机灵: 'l',
} as const;

/** {@link TYPE_CODES} 中的全部中文类型名称，以顿号分隔。 */
export const TYPE_NAMES = Object.keys(TYPE_CODES).join('、');

/** 一言接口 `c` 参数接受的句子类型代码。 */
export type SentenceType = (typeof TYPE_CODES)[keyof typeof TYPE_CODES];

/**
 * 将中文句子类型名称转换为一言接口的类型代码。
 *
 * @remarks
 * 返回的代码数组可以直接传给 {@link fetchSentence}。
 *
 * @param names - 要转换的类型名称数组。每个元素都必须是 {@link TYPE_CODES} 的键。
 * @returns 与 `names` 顺序一致的类型代码数组。
 * @throws `names` 包含不支持的类型名称时抛出 `Error`。
 *
 * @example
 * ```ts
 * resolveTypeCodes(['动画', '诗词']);
 * // => ['a', 'i']
 * ```
 *
 * @see {@link https://developer.hitokoto.cn/sentence/#请求参数 | 一言语句接口请求参数}
 */
export function resolveTypeCodes(names: string[]): SentenceType[] {
  return names.map(name => {
    const code: SentenceType = TYPE_CODES[<keyof typeof TYPE_CODES>name];

    if (!code) {
      throw new Error(`类型「${name}」不是有效值，支持的句子类型有：${TYPE_NAMES}`);
    }
    return code;
  });
}

/** 一言 v1 语句接口成功响应的完整返回信息。 */
export interface Sentence {
  /** 一言标识 */
  readonly id: number;
  /** 一言正文。编码方式 unicode。使用 utf-8。 */
  readonly hitokoto: string;
  /** 类型。请参考第三节参数的表格 */
  readonly type: SentenceType;
  /** 一言的出处 */
  readonly from: string;
  /** 一言的作者 */
  readonly from_who: string | null;
  /** 添加者 */
  readonly creator: string;
  /** 添加者用户标识 */
  readonly creator_uid: number;
  /** 审核员标识 */
  readonly reviewer: number;
  /** 一言唯一标识，可以链接到 https://hitokoto.cn?uuid=[uuid] 查看这个一言的完整信息 */
  readonly uuid: string;
  /** 提交方式 */
  readonly commit_from: string;
  /** 添加时间 */
  readonly created_at: string;
  /** 句子长度 */
  readonly length: number;
}

/**
 * 一言 v1 语句接口的错误响应体。
 *
 * @see {@link https://github.com/hitokoto-osc/hitokoto-api/blob/master/src/controllers/hitokoto/_utils.js#L119-L127 | 一言接口错误响应源码}
 */
export interface ErrorResponse {
  /** HTTP 状态码。 */
  readonly status: number;
  /** 错误信息。 */
  readonly message: string;
  /** 错误响应的数据，接口当前返回空数组。 */
  readonly data: unknown[];
  /** 生成响应时的 Unix 时间戳，单位为毫秒。 */
  readonly ts: number;
}

/**
 * 将单个句子类型代码规范化为代码数组。
 *
 * @remarks
 * 未提供 `types` 时，函数读取以逗号分隔的 `HITOKOTO_TYPES`。环境变量未设置时返回空数组。
 * 显式传入空数组会跳过环境变量，表示不限制句子类型。
 *
 * @param types - 单个句子类型代码或句子类型代码数组。
 * @returns 用于生成一言接口 `c` 查询参数的类型代码数组。
 */
export function resolveTypes(types: string | string[] = import.meta.env.HITOKOTO_TYPES?.split(',') ?? []): string[] {
  return typeof types === 'string' ? [types] : types;
}

/**
 * 判断一个值是否符合一言接口的错误响应结构。
 *
 * @remarks
 * 该类型守卫只检查响应体字段，不读取或判断 HTTP 响应状态。
 *
 * @param value - 要检查的值，通常是解析后的非 2xx 响应体。
 * @returns 如果 `value` 符合 {@link ErrorResponse} 结构则返回 `true`，否则返回 `false`。
 * @see {@link https://github.com/hitokoto-osc/hitokoto-api/blob/master/src/controllers/hitokoto/_utils.js#L119-L127 | 一言接口错误响应源码}
 */
export function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof value.status === 'number' &&
    'message' in value &&
    typeof value.message === 'string' &&
    'data' in value &&
    Array.isArray(value.data) &&
    'ts' in value &&
    typeof value.ts === 'number'
  );
}

/**
 * 请求一言 v1 语句接口，并返回随机语句的完整信息。
 *
 * @remarks
 * `types` 接收接口类型代码，不接收中文类型名称。中文名称可以先通过 {@link resolveTypeCodes} 转换。
 * 每个类型代码会作为独立的 `c` 查询参数发送，对应官网「可选择多个分类」的用法。
 *
 * 未提供 `types` 时，函数读取以逗号分隔的 `HITOKOTO_TYPES`。环境变量未设置时不限制句子类型。
 * 显式传入空数组时，不会读取环境变量，也不会发送 `c` 查询参数。
 *
 * @param types - 单个句子类型代码或句子类型代码数组。
 * @returns 一个 Promise，成功时返回完整的 {@link Sentence}。
 * @throws 收到非 2xx 响应时抛出 `Error`。如果响应体符合 {@link ErrorResponse}，错误信息使用其 `message`，
 * 否则错误信息包含 HTTP 状态码。
 * @throws 网络请求失败或成功响应无法解析为 JSON 时，传播底层错误。
 *
 * @example
 * ```ts
 * const types = resolveTypeCodes(['动画', '诗词']);
 * const sentence = await fetchSentence(types);
 * console.log(sentence.hitokoto);
 * ```
 *
 * @see {@link https://developer.hitokoto.cn/sentence/ | 一言语句接口}
 */
export async function fetchSentence(types?: SentenceType | SentenceType[]): Promise<Sentence> {
  const url = new URL(HITOKOTO_API);

  for (const type of resolveTypes(types)) {
    url.searchParams.append('c', type);
  }
  const response = await fetch(url);

  if (response.ok) {
    return <Sentence>await response.json();
  }
  const body = await response.json().catch(() => null);

  if (isErrorResponse(body)) {
    throw new Error(body.message);
  }
  throw new Error(`Hitokoto 请求失败，状态码 ${response.status}`);
}
