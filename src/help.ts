const { upday, version, changelogs } = require('../package.json');

const KOKKORO_UPDAY = upday;
const KOKKORO_VERSION = version;
const KOKKORO_CHANGELOGS = changelogs;

const HELP_BOT = `--------------------
# 列出 bot 状态信息
  >bot
# 登录 bot
  >login <qq>
# 注销 bot
  >logout <qq>
# 删除离线 bot
  >delete <qq>
`;

const HELP_PLUGIN = `--------------------
# 列出 bot 插件信息
  >plugin
# 当前 bot 启用该插件
  >enable <plugin>
# 当前 bot 禁用该插件
  >disable <plugin>
# 重载插件
  >reload <plugin>
`;

const HELP_CONFIG = `--------------------
# 列出当前账号 config 信息
  >config
`;

const HELP_SETTIING = `--------------------
# 列出当前群聊插件列表
  >list
# 列出当前插件信息
  > <plugin>
# 修改当前群聊插件选项
  > <plugin> <option> <param>
`;

const HELP_ALL: { [k: string]: string } = {
  bot: `机器人相关指令：\n${HELP_BOT}`,
  plugin: `插件相关指令：\n${HELP_PLUGIN}`,
  conf: `全局设定指令：\n${HELP_CONFIG}`,
  setting: `群聊插件指令：\n${HELP_SETTIING}`,
  default: `管理指令一览：
${HELP_BOT + HELP_PLUGIN + HELP_CONFIG + HELP_SETTIING}--------------------
# 打印当前字符
  >echo <message>
# 重启当前程序
  >restart
# 退出当前程序
  >shutdown`
};

export {
  KOKKORO_VERSION, KOKKORO_UPDAY, KOKKORO_CHANGELOGS, HELP_ALL,
}
