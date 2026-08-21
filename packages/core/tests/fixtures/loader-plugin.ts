import { useEvent } from '@kokkoro/core';

export const calls: string[] = [];

export const reset = (): void => {
  calls.length = 0;
};

export default function LoaderPlugin() {
  calls.push('render');

  useEvent(() => {
    calls.push('setup');

    return () => {
      calls.push('cleanup');
    };
  }, []);
}
