import { Client, Config as Protocol, MessageRet } from 'oicq';
import { BotEventMap } from '@/events';
/** bot 消息 */
export interface BotMessage {
    name: keyof BotEventMap;
    event: any;
}
export declare type BotPostMessage = {
    name: 'thread.process.stdin';
    event?: string;
};
export declare type UserLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export interface BotConfig {
    /** 自动登录，默认 true */
    auto_login?: boolean;
    /** 登录模式，默认 qrcode */
    mode: 'qrcode' | 'password';
    /** bot 主人 */
    masters?: number[];
    /** 协议配置 */
    protocol?: Protocol;
}
export declare class Bot extends Client {
    private masters;
    private profile;
    private pluginPort;
    private readonly mode;
    private readonly password_path;
    constructor(uin: number, config?: BotConfig);
    private proxyBotPortEvents;
    private bindBotPortEvents;
    private onClose;
    private onMessage;
    private onMessageError;
    private onLinkChannel;
    linkStart(): Promise<void>;
    private inputTicket;
    /**
     * 获取用户权限等级
     *
     * level 0 群成员（随活跃度提升）
     * level 1 群成员（随活跃度提升）
     * level 2 群成员（随活跃度提升）
     * level 3 管  理
     * level 4 群  主
     * level 5 主  人
     * level 6 维护组
     *
     * @param event - 群聊/私聊消息
     * @returns 用户等级
     */
    private getUserLevel;
    private inputPassword;
    private listenPortEvents;
    private onBindSetting;
    private onBindEvent;
    private onApiTrigger;
    /**
     * 给 bot 主人发送信息
     *
     * @param message - 通知信息
     * @returns 发消息的返回值
     */
    sendMasterMsg(message: string): Promise<MessageRet[]>;
    private onFirstOnline;
    private onOnline;
    private onOffline;
    /**
     * 绑定事件监听
     */
    private bindEvents;
    /**
     * 查询用户是否为 master
     *
     * @param user_id - 用户 id
     * @returns 查询结果
     */
    isMaster(user_id: number): boolean;
    /**
     * 查询用户是否为 admin
     *
     * @param user_id - 用户 id
     * @returns 查询结果
     */
    isAdmin(user_id: number): boolean;
}
