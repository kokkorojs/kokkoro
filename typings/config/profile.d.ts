import { Bot } from '@/core';
import { PluginSetting } from '@/plugin';
/** 群聊 */
export declare type Group = {
    /** 群名称 */
    name: string;
    /** 插件 */
    plugin: {
        /** 插件名 */
        [name: string]: PluginSetting;
    };
};
export interface UpdateSettingEvent {
    name: string;
    setting: PluginSetting;
}
export declare class Profile {
    private bot;
    plugins: string[];
    group: {
        [group_id: number]: Group;
    };
    defaultSetting: {
        [key: string]: PluginSetting;
    };
    readonly file: string;
    constructor(bot: Bot);
    /**
     * 绑定事件监听
     */
    private bindEvents;
    private write;
    private onUpdateSetting;
    private onGroupIncrease;
    private onGroupDecrease;
    private refresh;
    getDefaultSetting(name: string): PluginSetting;
    getSetting(group_id: number, name: string): PluginSetting;
}
