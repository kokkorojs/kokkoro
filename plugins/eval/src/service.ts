import { spawn } from 'bun';

const { EVAL_TIMEOUT: TIMEOUT = 1000 * 60, EVAL_MAX_BUFFER: MAX_BUFFER = 1024 * 64 } = import.meta.env;

/** 在独立的 Bun 子进程中执行代码，并返回标准输出和错误输出。 */
export async function evaluate(source: string): Promise<string | undefined> {
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
