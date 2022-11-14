import { EventEmitter } from 'events';
import { BroadcastChannel } from 'worker_threads';

/** 广播事件地图 */
interface BroadcastEventMap<T = any> {
  'bot.broadcast.close': (this: T) => void;
  'bot.broadcast.message': (this: T, message: unknown) => void;
  'bot.broadcast.messageerror': (this: T, error: unknown) => void;
}

/** 广播消息 */
interface BroadcastMessage {
  name: string;
  [key: string]: any;
}

/** 广播事件接口 */
export interface Broadcast extends EventEmitter {
  addListener<T extends keyof BroadcastEventMap>(event: T, listener: BroadcastEventMap<this>[T]): this;
  addListener(eventName: string | symbol, listener: (...args: any[]) => void): this;

  emit<T extends keyof BroadcastEventMap>(event: T, ...args: Parameters<BroadcastEventMap<this>[T]>): boolean;
  emit(eventName: string | symbol, ...args: any[]): boolean;

  on<T extends keyof BroadcastEventMap>(event: T, listener: BroadcastEventMap<this>[T]): this
  on(eventName: string | symbol, listener: (...args: any[]) => void): this;

  once<T extends keyof BroadcastEventMap>(event: T, listener: BroadcastEventMap<this>[T]): this
  once(eventName: string | symbol, listener: (...args: any[]) => void): this;

  prependListener<T extends keyof BroadcastEventMap>(event: T, listener: BroadcastEventMap<this>[T]): this
  prependListener(eventName: string | symbol, listener: (...args: any[]) => void): this;

  prependOnceListener<T extends keyof BroadcastEventMap>(event: T, listener: BroadcastEventMap<this>[T]): this
  prependOnceListener(eventName: string | symbol, listener: (...args: any[]) => void): this;

  removeListener<T extends keyof BroadcastEventMap>(event: T, listener: BroadcastEventMap<this>[T]): this
  removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this;

  off<T extends keyof BroadcastEventMap>(event: T, listener: BroadcastEventMap<this>[T]): this
  off(eventName: string | symbol, listener: (...args: any[]) => void): this;
}

export class Broadcast extends EventEmitter {
  private channel: BroadcastChannel;

  constructor(
    private name: string
  ) {
    super();

    this.channel = new BroadcastChannel(name);
    this.initEvents();
    this.bindEvents();
  }

  public close() {
    this.channel.close();
    this.emit('bot.broadcast.close');
  }

  public postMessage(message: BroadcastMessage) {
    this.channel.postMessage(message);
  }

  private initEvents() {
    this.channel.onmessage = message => this.emit('bot.broadcast.message', message);
    this.channel.onmessageerror = error => this.emit('bot.broadcast.messageerror', error);
  }

  private bindEvents() {
    this.on('bot.broadcast.close', this.onClose);
    this.on('bot.broadcast.message', this.onMessage);
    this.on('bot.broadcast.messageerror', this.onMessageError);
  }

  private onClose() {
    console.log(`广播 ${this.name} 已关闭`);
  }

  private onMessage(message: unknown) {
    const { data } = message as { data: BroadcastMessage };

    if (!data.name) {
      throw new Error('message error');
    }
    this.emit(data.name, data);
  }

  private onMessageError(error: unknown) {
    console.log('反序列化消息失败:', (<Error>error).message);
  }
}
