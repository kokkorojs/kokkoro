import { Metadata, useCommand, useEvent } from '@kokkoro/core';

export const metadata: Metadata = {
  name: 'example',
  description: '示例插件',
};

export default function Example(): void {
  useEvent(() => {
    console.log('Bot online.');
  }, ['session.ready']);

  useCommand('/测试', () => 'hello world');
  useCommand('/复读 <message>', event => event.query.message);
}
