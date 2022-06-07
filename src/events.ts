import { EventMap } from 'oicq';

// 获取事件类型
type EventType<T> = T extends (arg: infer P) => void ? P & { sub_name: string } : { sub_name: string };

export type BotEventMap = {
  [K in keyof EventMap]: EventType<EventMap[K]>;
};

export const event_names: string[] = [
  'system.login.qrcode',
  'system.login.slider',
  'system.login.device',
  'system.login.error',
  'system.online',
  'system.offline.network',
  'system.offline.kickoff',
  'system.offline',
  'request.friend.add',
  'request.friend.single',
  'request.friend',
  'request.group.add',
  'request.group.invite',
  'request.group',
  'request',
  'message.private',
  'message.private.friend',
  'message.private.group',
  'message.private.other',
  'message.private.self',
  'message.group',
  'message.group.normal',
  'message.group.anonymous',
  'message.discuss',
  'message',
  'notice.friend.increase',
  'notice.friend.decrease',
  'notice.friend.recall',
  'notice.friend.poke',
  'notice.group.increase',
  'notice.group.decrease',
  'notice.group.recall',
  'notice.group.admin',
  'notice.group.ban',
  'notice.group.transfer',
  'notice.group.poke',
  'notice.friend',
  'notice.group',
  'notice',
];
