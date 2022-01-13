import { Config } from 'oicq';

// 全局对象
declare global {
  // 当前进程目录
  var __workname: string;
}

// kokkoro 全局配置
interface GlobalConfig {
  // 服务端口
  port: number;
  // bot 插件
  plugins: string[];
  // bot 信息
  bots: {
    // uin 账号
    [uin: number]: {
      // 指令前缀，默认为 '>'
      prefix: string;
      // 自动登录，默认 true
      auto_login: boolean;
      // 登录模式，默认 qrcode
      login_mode: 'qrcode' | 'password';
      // bot 主人
      masters: number[];
      // 登录配置
      config: Config;
    }
  }
}

// 群聊
interface Group {
  // 群名称
  name: string;
  // 插件
  plugin: {
    // 插件名
    [plugin_name: string]: Option;
  }
}

// 插件选项
interface Option {
  // 插件锁定
  lock: boolean;
  // 插件开关
  apply: boolean;
  // 其它设置
  [param: string]: string | number | boolean | Array;
}

interface Setting {
  // 插件列表
  all_plugin: string[];
  // 群聊列表
  [group_id: number]: Group
}

declare module "oicq" {
  export interface GroupMessageEvent {
    self_id: number;
  }
  export interface PrivateMessageEvent {
    self_id: number;
  }
  export interface DiscussMessageEvent {
    self_id: number;
  }
}