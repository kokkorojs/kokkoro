import { useCommand, useEvent } from '@kokkoro/core';

/**
 * @type {import('@kokkoro/core').Metadata}
 */
export const metadata = {
  name: 'example',
  description: '示例插件',
};

export default function Example() {
  useEvent(() => console.log('Bot online.'), ['session.ready']);

  useCommand('/测试', () => 'hello world');
  useCommand('/复读 <message>', event => event.query.message);
}
