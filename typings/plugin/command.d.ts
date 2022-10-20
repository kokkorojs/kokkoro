import { MessageElem } from 'oicq';
import { Plugin } from '../plugin';
import { Context } from '../events';
import { UserLevel } from '../core';
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
export declare type CommandType = keyof CommandMap;
export declare class Command<K extends CommandType = any> {
    /** 插件实例 */
    plugin: Plugin;
    /** 命令 */
    raw_name: string;
    /** 消息类型 */
    message_type: CommandType;
    private regex?;
    private min_level;
    private max_level;
    name: string;
    desc: string;
    args: CommandArg[];
    stop: (ctx: CommandMap[K]) => void;
    func?: (ctx: CommandMap[K]) => void;
    constructor(
    /** 插件实例 */
    plugin: Plugin, 
    /** 命令 */
    raw_name: string, 
    /** 消息类型 */
    message_type?: CommandType);
    run(context: CommandMap[K]): void;
    description(desc: string): Command<K>;
    sugar(shortcut: string | RegExp): Command<K>;
    action(callback: (ctx: CommandMap[K]) => any): this;
    prevent(callback: (ctx: CommandMap[K]) => any): this;
    reply(context: CommandMap[K], message: string | MessageElem[]): void;
    limit(min_level: UserLevel, max_level?: UserLevel): this;
    isLimit(level: UserLevel): boolean;
    isMatched(context: Context<'message'>): boolean;
    parseQuery(raw_message: string): object;
}
export {};
