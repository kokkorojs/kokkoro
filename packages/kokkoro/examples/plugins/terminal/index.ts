import { useCommand } from '@kokkoro/core';

function runCode(code: string) {
  return new Function(`return ${code}`)();
}

export default () => {
  useCommand('/terminal <code>...', context => {
    return runCode(context.args.code.join(' '));
  });
};
