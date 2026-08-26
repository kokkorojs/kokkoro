import { useCommand } from '@kokkoro/core';

export default () => {
  useCommand('/echo <parts>...', context => {
    return context.args.parts.join(' ');
  });
};
