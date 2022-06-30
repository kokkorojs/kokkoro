import { Option } from '../plugin';

// 群聊
export type Group = {
  // 群名称
  name: string;
  // 插件
  plugin: {
    // 插件名
    [name: string]: Option;
  }
}

export type Setting = {
  // 插件列表
  plugins: string[];
  // 群聊列表
  [group_id: number]: Group;
};
