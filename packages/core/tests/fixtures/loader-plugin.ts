import { useDispose, useEvent } from '@kokkoro/core';

export const calls: string[] = [];

calls.push('import');
useDispose(() => {
  calls.push('dispose:first');
});
useDispose(() => {
  calls.push('dispose:second');
});

export const reset = (): void => {
  calls.length = 0;
};

export default () => {
  calls.push('setup');

  useEvent(() => {
    calls.push('mount');
  }, []);

  return () => {
    calls.push('cleanup');
  };
};
