import { Metadata, useCommand } from '@kokkoro/core';
import { CommandEvent } from '@kokkoro/core/lib/plugin/command.js';
import {
  hitMonster,
  initClanBattle,
  killMonster,
  knockOff,
  parseProgress,
  revokeHit,
  terminateClanBattle,
} from '@/service.js';

export interface Member {
  id: string;
  name?: string;
}

function parseId(event: CommandEvent): string {
  if (event.t === 'AT_MESSAGE_CREATE') {
    return event.guild_id;
  } else {
    return event.group_openid;
  }
}

function parseMember(event: CommandEvent): Member {
  if (event.t === 'AT_MESSAGE_CREATE') {
    return {
      id: event.author.id,
      name: event.author.username,
    };
  } else {
    return {
      id: event.author.member_openid,
    };
  }
}

export const metadata: Metadata = {
  name: 'pcr',
  description: '公主连结',
};

export default function Priconne() {
  useCommand('/发起会战 <service>', event => {
    const id = parseId(event);
    return initClanBattle(id, event.query.service);
  });
  useCommand('/结束会战', event => {
    const id = parseId(event);
    return terminateClanBattle(id);
  });
  useCommand('/状态', event => {
    const id = parseId(event);
    return parseProgress(id);
  });
  useCommand('/报刀 <boss> <damage>', event => {
    const id = parseId(event);
    const member = parseMember(event);
    const { boss, damage } = event.query;

    return hitMonster(id, member, +boss, +damage);
  });
  useCommand('/尾刀 <boss>', event => {
    const id = parseId(event);
    const member = parseMember(event);
    const { boss } = event.query;

    return killMonster(id, member, +boss);
  });
  useCommand('/撤销', event => {
    const id = parseId(event);
    const member = parseMember(event);

    return revokeHit(id, member);
  });
  useCommand('/预约', () => '目前机器人无法获取到用户昵称，也不能在群聊 at 成员，暂未支持');
  useCommand('/激爽下班', event => {
    const id = parseId(event);
    const member = parseMember(event);

    return knockOff(id, member);
  });
}
