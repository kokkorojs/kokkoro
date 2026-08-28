import { useCommand } from '@kokkoro/core';

function execute(parts: string[]) {
  return new Function(`return ${parts.join(' ')}`)();
}

export default () => {
  useCommand('/eval <parts>...', context => {
    return execute(context.args.parts);
  });
};
