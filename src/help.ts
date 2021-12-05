const { upday, version, changelogs } = require('../package.json');

const KOKKORO_UPDAY = upday;
const KOKKORO_VERSION = version;
const KOKKORO_CHANGELOGS = changelogs;

const HELP_BOT = `--------------------
>bot ##列出所有机器人实例
>login <uin> ##登录机器人
>logout <uin> ##机器人离线
>bot del <uin> ##删除离线机器人
>bot help ##查看帮助
※ <uin> 代表QQ账号
`;

const HELP_PLUGIN = `--------------------
>plug ##列出全部插件及启用的机器人
>enable <name> ##当前bot启用该插件
>disable <name> ##当前bot禁用该插件
>plug on-all <name> ##全bot启用该插件
>plug off-all <name> ##全bot禁用该插件
>plug del <name> ##删除一个插件
>plug reboot <name> ##重启一个插件
>plug help ##查看帮助
※ <name> 代表插件名称
`;

const HELP_CONF = `--------------------
>conf ##列出当前全局设定的值
>conf opn-al ## 开启自动登录
>conf cls-al ## 关闭自动登录
>conf add-mst <uin> ##添加管理员
>conf del-mst <uin> ##删除管理员
>conf prefix <param> ##修改管理指令前缀
>conf platform <param> ##修改默认登录协议
>conf log_level <param> ##修改默认日志等级
>conf help ##查看帮助
※ <uin> 代表QQ账号
`;

const HELP_SETTIING = `--------------------
>list ##列出当前群聊插件列表
>setting  ##列出当前群聊设定
>setting default <plug>  ##初始化插件设置（开发中）
※ <plug> 代表插件名称
`;

const HELP_ALL: { [k: string]: string } = {
  bot: `机器人相关指令：\n${HELP_BOT}`,
  plug: `插件相关指令：\n${HELP_PLUGIN}`,
  conf: `全局设定指令：\n${HELP_CONF}`,
  setting: `群聊插件指令：\n${HELP_SETTIING}`,
  default: `管理指令一览：
${HELP_BOT + HELP_PLUGIN + HELP_CONF + HELP_SETTIING}--------------------
>echo <msg> ##打印当前字符
>set ##设置当前机器人的运行时参数
>restart ##重启当前程序
>shutdown ##退出当前程序`
};

export {
  KOKKORO_VERSION, KOKKORO_UPDAY, KOKKORO_CHANGELOGS, HELP_ALL
}