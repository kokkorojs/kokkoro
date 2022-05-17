import events from 'oicq/lib/events';
import { GuildMessageEvent } from 'oicq/lib/internal/guild';

// self_id 属性可能在未来会被移除，少用
declare module 'oicq' {
  export interface FriendRequestEvent {
    self_id: number;
  }
  export interface GroupRequestEvent {
    self_id: number;
  }
  export interface GroupInviteEvent {
    self_id: number;
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  export interface GroupMessageEvent {
    self_id: number;
  }
  export interface PrivateMessageEvent {
    self_id: number;
  }
  export interface DiscussMessageEvent {
    self_id: number;
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  export interface FriendIncreaseEvent {
    self_id: number;
  }
  export interface FriendDecreaseEvent {
    self_id: number;
  }
  export interface FriendRecallEvent {
    self_id: number;
  }
  export interface FriendPokeEvent {
    self_id: number;
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  export interface MemberIncreaseEvent {
    self_id: number;
  }
  export interface MemberDecreaseEvent {
    self_id: number;
  }
  export interface GroupRecallEvent {
    self_id: number;
  }
  export interface GroupAdminEvent {
    self_id: number;
  }
  export interface GroupMuteEvent {
    self_id: number;
  }
  export interface GroupTransferEvent {
    self_id: number;
  }
  export interface GroupPokeEvent {
    self_id: number;
  }
}

declare module 'oicq/lib/internal/guild' {
  export interface GuildMessageEvent {
    self_id: number;
  }
}

export type AllMessageEvent = events.GroupMessageEvent | events.PrivateMessageEvent | events.DiscussMessageEvent;
export type AllRequestEvent = events.FriendRequestEvent | events.GroupRequestEvent | events.GroupInviteEvent;
export type AllFriendNotice = events.FriendIncreaseEvent | events.FriendDecreaseEvent | events.FriendRecallEvent | events.FriendPokeEvent;
export type AllGroupNotice = events.MemberIncreaseEvent | events.MemberDecreaseEvent | events.GroupRecallEvent | events.GroupAdminEvent | events.GroupMuteEvent | events.GroupTransferEvent | events.GroupPokeEvent;

export interface EventMap {
  /** 好友申请 */
  'request.friend.add': events.FriendRequestEvent;
  /** 对方已将你加为单向好友，可回添对方 */
  'request.friend.single': events.FriendRequestEvent;

  'request.friend': events.FriendRequestEvent;

  /** 加群申请 */
  'request.group.add': events.GroupRequestEvent;
  /** 群邀请 */
  'request.group.invite': events.GroupInviteEvent;

  'request.group': events.GroupRequestEvent | events.GroupInviteEvent;

  /** 所有request */
  'request': AllRequestEvent;

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  /** 所有私聊消息 */
  'message.private': events.PrivateMessageEvent;
  /** 从好友 */
  'message.private.friend': events.PrivateMessageEvent;
  /** 从群临时会话 */
  'message.private.group': events.PrivateMessageEvent;
  /** 从其他途径 */
  'message.private.other': events.PrivateMessageEvent;
  /** 从我的设备 */
  'message.private.self': events.PrivateMessageEvent;

  /** 所有群消息 */
  'message.group': events.GroupMessageEvent;
  /** 普通群消息 */
  'message.group.normal': events.GroupMessageEvent;
  /** 匿名群消息 */
  'message.group.anonymous': events.GroupMessageEvent;

  /** 所有消息 */
  'message': AllMessageEvent;

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  /** 新增好友事件 */
  'notice.friend.increase': events.FriendIncreaseEvent;
  /** 好友(被)删除事件 */
  'notice.friend.decrease': events.FriendDecreaseEvent;
  /** 好友消息撤回事件 */
  'notice.friend.recall': events.FriendRecallEvent;
  /** 好友戳一戳事件 */
  'notice.friend.poke': events.FriendPokeEvent;
  /** 入群・群员增加事件 */
  'notice.group.increase': events.MemberIncreaseEvent;
  /** 踢群・退群事件 */
  'notice.group.decrease': events.MemberDecreaseEvent;
  /** 群消息撤回事件 */
  'notice.group.recall': events.GroupRecallEvent;
  /** 管理员变更事件 */
  'notice.group.admin': events.GroupAdminEvent;
  /** 群禁言事件 */
  'notice.group.ban': events.GroupMuteEvent;
  /** 群转让事件 */
  'notice.group.transfer': events.GroupTransferEvent;
  /** 群戳一戳事件 */
  'notice.group.poke': events.GroupPokeEvent;
  /** 所有好友notice事件 */
  'notice.friend': AllFriendNotice;
  /** 所有群notice事件 */
  'notice.group': AllGroupNotice;
  /** 所有notice事件 */
  'notice': AllFriendNotice | AllGroupNotice;

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  /** 频道相关: 频道消息 */
  'guild.message': GuildMessageEvent;
}
