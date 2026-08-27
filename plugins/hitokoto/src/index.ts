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

for (const type of HITOKOTO_TYPES.split(',')) {
  HITOKOTO_API.searchParams.append('c', type);
}

export default () => {
  useCommand('/一言', async () => {
    const response = await fetch(HITOKOTO_API);

    if (!response.ok) {
      throw new Error(`接口请求失败，状态码 ${response.status}`);
    }
    const { hitokoto, from } = <Sentence>await response.json();

    return `『${hitokoto}』——「${from}」`;
  }).shortcut('来点骚话');
};
