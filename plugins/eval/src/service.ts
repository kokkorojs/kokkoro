import { spawn } from 'bun';

import { type Logger } from '@kokkoro/core';

const { EVAL_TIMEOUT: TIMEOUT = '10000', EVAL_MAX_BUFFER: MAX_BUFFER = '32768' } = import.meta.env;

/**
 * 在独立的 Bun 子进程中执行代码，并返回标准输出和错误输出。
 *
 * @param logger - 在 debug 日志中记录代码、原始标准输出、原始错误输出和退出码。
 */
export async function evaluate(source: string, logger?: Logger): Promise<string | undefined> {
  const signal = AbortSignal.timeout(Number(TIMEOUT));

  logger?.debug('开始执行代码', { source });

  const subprocess = spawn([process.execPath, '--no-env-file', '--print', source], {
    env: {},
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

  logger?.debug('代码执行结果', { stdout, stderr, exitCode });

  if (signal.aborted) {
    throw new Error('代码执行超时');
  }

  if (exitCode) {
    throw new Error(stderr.trim() || `代码执行失败，退出码 ${exitCode}`);
  }
  return [stdout.trim(), stderr.trim()].filter(Boolean).join('\n') || undefined;
}
