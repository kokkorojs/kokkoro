import { useCommand } from '@kokkoro/core';

function runCode(code: string) {
  return new Function(`return ${code}`)();
}

export default function Terminal() {
  useCommand('/terminal <code>...', context => {
    return runCode(context.args.code.join(' '));
  });
}
