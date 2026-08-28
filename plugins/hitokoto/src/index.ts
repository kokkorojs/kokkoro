import { useCommand } from '@kokkoro/core';

type SentenceType =
  | 'a' // 动画
  | 'b' // 漫画
  | 'c' // 游戏
  | 'd' // 文学
  | 'e' // 原创
  | 'f' // 来自网络
  | 'g' // 其他
  | 'h' // 影视
  | 'i' // 诗词
  | 'j' // 网易云
  | 'k' // 哲学
  | 'l'; // 抖机灵

interface Sentence {
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

const { HITOKOTO_TYPES = 'a,b' } = import.meta.env;
const HITOKOTO_API = new URL('https://v1.hitokoto.cn');
const TYPE_CODES = {
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
} as const satisfies Record<string, SentenceType>;
const TYPE_NAMES = Object.keys(TYPE_CODES).join('、');

function resolveTypes(names: string[]) {
  if (names.length === 0) {
    return HITOKOTO_TYPES.split(',');
  }
  return names.map(name => {
    const type = TYPE_CODES[<keyof typeof TYPE_CODES>name];

    if (!type) {
      throw new Error(`不支持的一言类型「${name}」，可用类型为${TYPE_NAMES}`);
    }
    return type;
  });
}

async function getHitokoto(names: string[]) {
  const url = new URL(HITOKOTO_API);

  for (const type of resolveTypes(names)) {
    url.searchParams.append('c', type);
  }
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`接口请求失败，状态码 ${response.status}`);
  }
  const { hitokoto, from } = <Sentence>await response.json();

  return `『${hitokoto}』——「${from}」`;
}

export default () => {
  useCommand('/一言 [types]...', context => getHitokoto(context.args.types)).shortcut('来点骚话');
};
