import { Metadata, useCommand, useEvent } from '@kokkoro/core';

export const metadata: Metadata = {
  name: 'example',
  description: '示例插件',
};

export default function Example() {
  useEvent(
    ctx => {
      ctx.logger.mark('link start');
    },
    ['session.ready'],
  );

  useCommand('/测试', () => 'hello world');
  useCommand<{ message: string }>('/复读 <message>', ctx => ctx.query.message);
}
