import '../index';
import { Bot } from '../core';
import { UpdateSettingEvent } from '../config';
import { EventName, PluginEventMap } from '../events';
import { Listen } from '../plugin/listen';
import { Command, CommandType } from '../plugin/command';
/** 插件消息 */
export interface PluginMessage {
    name: keyof PluginEventMap;
    event: any;
}
export interface BindListenEvent {
    name: string;
    listen: string;
}
export declare type PluginPostMessage = {
    name: 'bot.bind.event';
    event: BindListenEvent;
} | {
    name: 'bot.bind.setting';
    event: UpdateSettingEvent;
};
/** 插件信息 */
export declare type PluginInfo = {
    /** 插件名 */
    name: string;
    /** 文件夹 */
    folder: string;
    /** 插件路径 */
    path: string;
    /** 是否是本地插件 */
    local: boolean;
};
/** 插件选项 */
export declare type PluginSetting = {
    /** 锁定，默认 false */
    lock: boolean;
    /** 开关，默认 true */
    apply: boolean;
    /** 其它设置 */
    [param: string]: string | number | boolean | Array<string | number>;
};
export declare class Plugin {
    /** 指令前缀 */
    prefix: string;
    /** 插件配置项 */
    setting: PluginSetting;
    _name: string;
    private _version;
    private events;
    private commands;
    private botPort;
    private listener;
    private info;
    constructor(
    /** 指令前缀 */
    prefix?: string, 
    /** 插件配置项 */
    setting?: PluginSetting);
    private proxyPluginPortEvents;
    private bindPluginPortEvents;
    private onClose;
    private onMessage;
    private onMessageError;
    private onLinkChannel;
    name(name: string): this;
    version(version: string): this;
    botApi<K extends keyof Bot>(uin: number, method: K, ...params: Bot[K] extends (...args: infer P) => any ? P : []): Promise<unknown>;
    /**
     * 指令监听
     *
     * @param raw_name - 指令
     * @param message_type - 消息类型
     * @returns Command 实例
     */
    command<T extends CommandType>(raw_name: string, message_type?: T): Command<T>;
    /**
     * 事件监听
     *
     * @param event_name - 事件名
     * @returns Listen 实例
     */
    listen<K extends EventName>(name: K): Listen<K>;
    private parse;
}
/**
 * 检索可用插件
 *
 * @returns 插件信息集合
 */
export declare function retrievalPlugins(): Promise<PluginInfo[]>;
