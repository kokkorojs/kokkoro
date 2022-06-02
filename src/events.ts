import events from 'oicq/lib/events';
import { LoginErrorCode } from 'oicq/lib/errors';
// import { GuildMessageEvent } from 'oicq/lib/internal/guild';

interface LoginQrcodeEvent {
  event_name: string;
  image: Buffer;
  self_id: number;
}

interface LoginSliderEvent {
  event_name: string;
  url: string;
  self_id: number;
}

interface LoginDeviceEvent {
  event_name: string;
  url: string;
  phone: string;
  self_id: number;
}

interface LoginErrorEvent {
  event_name: string;
  code: LoginErrorCode | number;
  message: string;
  self_id: number;
}

interface OnlineEvent {
  event_name: string;
}

interface OfflineEvent {
  event_name: string;
  message: string;
  self_id: number;
}

interface FriendRequestEvent extends events.FriendRequestEvent {
  event_name: string;
  self_id: number;
}

interface GroupRequestEvent extends events.GroupRequestEvent {
  event_name: string;
  self_id: number;
}

interface GroupInviteEvent extends events.GroupInviteEvent {
  event_name: string;
  self_id: number;
}

interface PrivateMessageEvent extends events.PrivateMessageEvent {
  event_name: string;
  self_id: number;
}

interface GroupMessageEvent extends events.GroupMessageEvent {
  event_name: string;
  self_id: number;
}

interface DiscussMessageEvent extends events.DiscussMessageEvent {
  event_name: string;
  self_id: number;
}

interface FriendIncreaseEvent extends events.FriendIncreaseEvent {
  event_name: string;
  self_id: number;
}

interface FriendDecreaseEvent extends events.FriendDecreaseEvent {
  event_name: string;
  self_id: number;
}

interface FriendRecallEvent extends events.FriendRecallEvent {
  event_name: string;
  self_id: number;
}

interface FriendPokeEvent extends events.FriendPokeEvent {
  event_name: string;
  self_id: number;
}

interface MemberIncreaseEvent extends events.MemberIncreaseEvent {
  event_name: string;
  self_id: number;
}

interface MemberDecreaseEvent extends events.MemberDecreaseEvent {
  event_name: string;
  self_id: number;
}

interface GroupRecallEvent extends events.GroupRecallEvent {
  event_name: string;
  self_id: number;
}

interface GroupAdminEvent extends events.GroupAdminEvent {
  event_name: string;
  self_id: number;
}

interface GroupMuteEvent extends events.GroupMuteEvent {
  event_name: string;
  self_id: number;
}

interface GroupTransferEvent extends events.GroupTransferEvent {
  event_name: string;
  self_id: number;
}

interface GroupPokeEvent extends events.GroupPokeEvent {
  event_name: string;
  self_id: number;
}

export type AllRequestEvent = FriendRequestEvent | GroupRequestEvent | GroupInviteEvent;
export type AllMessageEvent = GroupMessageEvent | PrivateMessageEvent | DiscussMessageEvent;
export type AllFriendNoticeEvent = FriendIncreaseEvent | FriendDecreaseEvent | FriendRecallEvent | FriendPokeEvent;
export type AllGroupNoticeEvent = MemberIncreaseEvent | MemberDecreaseEvent | GroupRecallEvent | GroupAdminEvent | GroupMuteEvent | GroupTransferEvent | GroupPokeEvent;


export interface EventMap {
  // 收到二维码
  'system.login.qrcode': LoginQrcodeEvent;
  // 收到滑动验证码
  'system.login.slider': LoginSliderEvent;
  // 设备锁验证事件
  'system.login.device': LoginDeviceEvent;
  // 登录遇到错误
  'system.login.error': LoginErrorEvent;
  // 上线事件
  'system.online': OnlineEvent;
  // 下线事件（网络原因，默认自动重连）
  'system.offline.network': OfflineEvent;
  // 下线事件（服务器踢）
  'system.offline.kickoff': OfflineEvent;
  // 下线事件
  'system.offline': OfflineEvent;

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  // 好友申请
  'request.friend.add': FriendRequestEvent;
  //  对方已将你加为单向好友，可回添对方
  'request.friend.single': FriendRequestEvent;
  'request.friend': FriendRequestEvent;

  // 加群申请
  'request.group.add': GroupRequestEvent;
  // 群邀请
  'request.group.invite': GroupInviteEvent;
  // 群事件
  'request.group': GroupRequestEvent | GroupInviteEvent;
  // 所有请求事件
  'request': AllRequestEvent;

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  // 所有私聊消息
  'message.private': PrivateMessageEvent;
  // 从好友
  'message.private.friend': PrivateMessageEvent;
  // 从群临时会话
  'message.private.group': PrivateMessageEvent;
  // 从其他途径
  'message.private.other': PrivateMessageEvent;
  // 从我的设备
  'message.private.self': PrivateMessageEvent;

  // 所有群消息
  'message.group': GroupMessageEvent;
  // 普通群消息
  'message.group.normal': GroupMessageEvent;
  // 匿名群消息
  'message.group.anonymous': GroupMessageEvent;
  // 讨论组消息
  'message.discuss': DiscussMessageEvent;
  // 所有消息
  'message': AllMessageEvent;

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  // 新增好友事件
  'notice.friend.increase': FriendIncreaseEvent;
  // 好友(被)删除事件
  'notice.friend.decrease': FriendDecreaseEvent;
  // 好友消息撤回事件
  'notice.friend.recall': FriendRecallEvent;
  // 好友戳一戳事件
  'notice.friend.poke': FriendPokeEvent;

  // 入群・群员增加事件
  'notice.group.increase': MemberIncreaseEvent;
  // 踢群・退群事件
  'notice.group.decrease': MemberDecreaseEvent;
  // 群消息撤回事件
  'notice.group.recall': GroupRecallEvent;
  // 管理员变更事件
  'notice.group.admin': GroupAdminEvent;
  // 群禁言事件
  'notice.group.ban': GroupMuteEvent;
  // 群转让事件
  'notice.group.transfer': GroupTransferEvent;
  // 群戳一戳事件
  'notice.group.poke': GroupPokeEvent;

  // 所有好友 notice 事件
  'notice.friend': AllFriendNoticeEvent;
  // 所有群 notice 事件
  'notice.group': AllGroupNoticeEvent;
  // 所有 notice 事件
  'notice': AllFriendNoticeEvent | AllGroupNoticeEvent;

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  // 频道相关: 频道消息（不推荐使用，未来会从 oicq 移除）
  // 'guild.message': GuildMessageEvent;
}

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
