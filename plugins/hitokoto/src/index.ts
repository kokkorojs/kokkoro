import { Metadata, useCommand } from '@kokkoro/core';

interface Hitokoto {
  // 一言标识
  id: string;
  // 一言正文 编码方式 unicode 使用 utf-8
  hitokoto: string;
  // 类型
  type: string;
  // 一言的出处
  from: string;
  // 一言的作者
  from_who: string;
  // 添加者
  creator: string;
  // 添加者用户标识
  creator_uid: string;
  // 审核员标识
  reviewer: string;
  // 一言唯一标识；可以链接到 https://hitokoto.cn?uuid=[uuid] (opens new window)查看这个一言的完整信息
  uuid: string;
  // 提交方式
  commit_from: string;
  // 添加时间
  created_at: string;
  // 句子长度
  length: number;
}
export const metadata: Metadata = {
  name: 'hitokoto',
  description: '一言语句',
};

export default function Hitokoto() {
  useCommand('/来点骚话', async (_, bot) => {
    const { data } = await bot.request.get<Hitokoto>('https://v1.hitokoto.cn?c=a&c=b');
    const { hitokoto, from } = data;
    const message = `『${hitokoto}』——「${from}」`;

    return message;
  });
}
