import { useCommand } from '@kokkoro/core';

export default function Ping() {
  useCommand('/ping', context => `pong ${Date.now() - Date.parse(context.timestamp)}ms`).shortcut('测试');
}
