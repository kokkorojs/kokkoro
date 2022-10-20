/// <reference types="node" />
import { Logger } from 'log4js';
import { Worker, WorkerOptions, MessagePort, TransferListItem } from 'worker_threads';
import { BotConfig } from './core';
import { ThreadEventMap } from './events';
import { PluginInfo } from './plugin';
/** bot api 事件 */
interface BotWorkerData {
    type: 'bot';
    uin: number;
    config?: BotConfig;
}
interface PluginWorkerData extends PluginInfo {
    type: 'plugin';
}
declare type WorkerData = BotWorkerData | PluginWorkerData;
interface ThreadOptions extends WorkerOptions {
    workerData: WorkerData;
}
/** 线程消息 */
export interface ThreadMessage {
    name: keyof ThreadEventMap;
    event: any;
}
export interface BotMessagePort extends MessagePort {
}
export interface PluginMessagePort extends MessagePort {
}
export interface BotLinkChannelEvent {
    name: string;
    port: PluginMessagePort;
}
export interface PluginLinkChannelEvent {
    uin: number;
    port: BotMessagePort;
}
export declare type ThreadPostMessage = {
    name: 'thread.process.stdout';
    content: string;
} | {
    name: 'bot.link.channel';
    event: BotLinkChannelEvent;
} | {
    name: 'plugin.link.channel';
    event: PluginLinkChannelEvent;
};
/** 事件接口 */
export interface Thread extends Worker {
    postMessage(message: ThreadPostMessage, transferList?: ReadonlyArray<TransferListItem>): void;
    addListener<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
    emit<T extends keyof ThreadEventMap>(event: T, ...args: Parameters<ThreadEventMap<this>[T]>): boolean;
    on<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
    once<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
    prependListener<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
    prependOnceListener<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
    removeListener<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
    off<T extends keyof ThreadEventMap>(event: T, listener: ThreadEventMap<this>[T]): this;
}
export declare class Thread extends Worker {
    private filename;
    private options;
    /** 日志 */
    logger: Logger;
    constructor(filename: string, options: ThreadOptions);
    private initEvents;
    private bindEvents;
    private onOnline;
    private onError;
    private onExit;
    private onMessage;
    private onMessageError;
    private onInput;
}
/**
 * 润
 */
export declare function runWorkerThreads(): Promise<void>;
export {};
