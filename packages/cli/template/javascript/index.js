import { useCommand, useEvent } from '@kokkoro/core';

/**
 * @type {import('@kokkoro/core').Metadata}
 */
export const metadata = {
  name: 'example',
  description: '插件示例',
};

export default function Example() {
  useEvent(
    ctx => {
      ctx.logger.mark('Bot online.');
    },
    ['session.ready'],
  );

  useCommand('/测试', () => 'hello world');
  useCommand('/复读 <message>', ctx => ctx.query.message);
}
