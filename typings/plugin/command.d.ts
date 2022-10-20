import { MessageElem } from 'oicq';
import { Plugin } from '../plugin';
import { UserLevel } from '../core';
import { Context } from '../events';
/** 指令参数 */
declare type CommandArg = {
    /** 是否必填 */
    required: boolean;
    /** 指令值 */
    value: string;
    /** 可选参数 */
    variadic: boolean;
};
export declare type CommandMap = {
    'all': Context<'message'>;
    'group': Context<'message.group'>;
    'private': Context<'message.private'>;
};
declare type CommandType = keyof CommandMap;
export declare class Command<K extends CommandType = any> {
    /** 插件实例 */
    plugin: Plugin;
    /** 命令 */
    raw_name: string;
    /** 消息类型 */
    message_type: string;
    private regex?;
    private min_level;
    private max_level;
    name: string;
    desc: string;
    args: CommandArg[];
    stop: (ctx: Context<'message'>) => void;
    func?: (ctx: Context<'message'>) => void;
    constructor(
    /** 插件实例 */
    plugin: Plugin, 
    /** 命令 */
    raw_name: string, 
    /** 消息类型 */
    message_type?: string);
    run(context: Context<'message.group' | 'message.private'>): void;
    description(desc: string): Command<K>;
    sugar(regex: RegExp): Command<K>;
    action(callback: (ctx: Context<'message'>) => any): Command<K>;
    prevent(callback: (ctx: Context<'message'>) => any): Command<K>;
    reply(context: Context<'message.group' | 'message.private'>, message: string | MessageElem[]): void;
    limit(min_level: UserLevel, max_level?: UserLevel): this;
    isLimit(level: UserLevel): boolean;
    isMatched(context: Context<'message'>): boolean;
    parseQuery(raw_message: string): {
        [key: string]: string;
    };
}
export {};
