import { spawn } from 'bun';

import { useCommand } from '@kokkoro/core';

const { EVAL_TIMEOUT: TIMEOUT = 1000 * 60, EVAL_MAX_BUFFER: MAX_BUFFER = 1024 * 64 } = import.meta.env;

async function execute(parts: string[]) {
  const source = parts.join(' ');
  const signal = AbortSignal.timeout(Number(TIMEOUT));
  const subprocess = spawn(['bun', '--print', source], {
    stderr: 'pipe',
    signal,
    killSignal: 'SIGKILL',
    maxBuffer: Number(MAX_BUFFER),
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    subprocess.stdout.text(),
    subprocess.stderr.text(),
    subprocess.exited,
  ]);

  if (signal.aborted) {
    throw new Error('代码执行超时');
  }

  if (exitCode) {
    throw new Error(stderr.trim() || `代码执行失败，退出码 ${exitCode}`);
  }
  return [stdout.trim(), stderr.trim()].filter(Boolean).join('\n') || undefined;
}

export default () => {
  useCommand('/执行 <parts>...', context => {
    return execute(context.args.parts);
  }).shortcut(/^>\s*(?<parts>.+)$/s);
};
