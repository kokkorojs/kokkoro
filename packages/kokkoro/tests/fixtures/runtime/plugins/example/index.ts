import { useDispose } from '@kokkoro/core';

import { events } from './state';

events.push('import');
await Promise.resolve();
useDispose(() => {
  events.push('dispose');
  throw new Error('释放失败');
});

export default () => {
  events.push('render');

  return () => {
    events.push('cleanup');
    throw new Error('取消挂载失败');
  };
};
