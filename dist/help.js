"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HELP_ALL = exports.KOKKORO_CHANGELOGS = exports.KOKKORO_UPDAY = exports.KOKKORO_VERSION = void 0;
const { upday, version, changelogs } = require('../package.json');
const KOKKORO_UPDAY = upday;
exports.KOKKORO_UPDAY = KOKKORO_UPDAY;
const KOKKORO_VERSION = version;
exports.KOKKORO_VERSION = KOKKORO_VERSION;
const KOKKORO_CHANGELOGS = changelogs;
exports.KOKKORO_CHANGELOGS = KOKKORO_CHANGELOGS;
const HELP_BOT = `--------------------
>bot ##列出所有机器人实例
>login <uin> ##登录机器人
>logout <uin> ##机器人离线
>bot del <uin> ##删除离线机器人
>bot help ##查看帮助
※ <uin> 代表QQ账号
`;
const HELP_PLUGIN = `--------------------
>plugin ##列出全部插件及启用的机器人
>enable <name> ##当前bot启用该插件
>disable <name> ##当前bot禁用该插件
>plugin on-all <name> ##全bot启用该插件
>plugin off-all <name> ##全bot禁用该插件
>plugin del <name> ##删除一个插件
>plugin restart <name> ##重启一个插件
>plugin help ##查看帮助
※ <name> 代表插件名称
`;
const HELP_CONF = `--------------------
>config ##列出当前全局设定的值
`;
const HELP_SETTIING = `--------------------
>list ##列出当前群聊插件列表
>setting  ##列出当前群聊设定
><plug> <option> <param>  ##修改当前群聊插件选项
※ <plug> 代表插件名称 <option> 代表插件选项 <param> 代表插件参数
`;
const HELP_ALL = {
    bot: `机器人相关指令：\n${HELP_BOT}`,
    plugin: `插件相关指令：\n${HELP_PLUGIN}`,
    conf: `全局设定指令：\n${HELP_CONF}`,
    setting: `群聊插件指令：\n${HELP_SETTIING}`,
    default: `管理指令一览：
${HELP_BOT + HELP_PLUGIN + HELP_CONF + HELP_SETTIING}--------------------
>echo <msg> ##打印当前字符
>set ##设置当前机器人的运行时参数
>restart ##重启当前程序
>shutdown ##退出当前程序`
};
exports.HELP_ALL = HELP_ALL;
