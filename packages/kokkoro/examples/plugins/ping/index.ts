import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/ping', context => `pong ${Date.now() - Date.parse(context.timestamp)}ms`).shortcut('测试');
};
