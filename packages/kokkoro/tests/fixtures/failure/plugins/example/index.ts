import { useDispose } from '@kokkoro/core';

import { events } from './state';

events.push('import');
useDispose(() => {
  events.push('dispose');
});
throw new Error('加载失败');

export default function Example() {}
