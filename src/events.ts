import { EventEmitter } from 'events';
import { DiscussMessageEvent, GroupMessageEvent, PrivateMessageEvent } from 'oicq';

declare module 'oicq' {
  export interface GroupMessageEvent {
    self_id: number;
  }
  export interface PrivateMessageEvent {
    self_id: number;
  }
  export interface DiscussMessageEvent {
    self_id: number;
  }
  //   //   export interface FriendIncreaseEvent {
  //   //     self_id: number;
  //   //   }
  //   //   export interface FriendDecreaseEvent {
  //   //     self_id: number;
  //   //   }
  //   //   export interface FriendRecallEvent {
  //   //     self_id: number;
  //   //   }
  //   //   export interface FriendPokeEvent {
  //   //     self_id: number;
  //   //   }
  //   //   export interface MemberIncreaseEvent {
  //   //     self_id: number;
  //   //   }
  //   //   export interface MemberDecreaseEvent {
  //   //     self_id: number;
  //   //   }
  //   //   export interface GroupRecallEvent {
  //   //     self_id: number;
  //   //   }
  //   //   export interface GroupAdminEvent {
  //   //     self_id: number;
  //   //   }
  //   //   export interface GroupMuteEvent {
  //   //     self_id: number;
  //   //   }
  //   //   export interface GroupTransferEvent {
  //   //     self_id: number;
  //   //   }
  //   //   export interface GroupPokeEvent {
  //   //     self_id: number;
  //   //   }
}

export const emitter = new EventEmitter();

export type AllMessageEvent = GroupMessageEvent | PrivateMessageEvent | DiscussMessageEvent;
