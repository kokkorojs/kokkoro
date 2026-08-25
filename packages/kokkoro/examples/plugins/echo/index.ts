import { useCommand } from '@kokkoro/core';

export default function Echo() {
  useCommand('/echo <messages>...', context => {
    return context.args.messages.join(' ');
  });
}
