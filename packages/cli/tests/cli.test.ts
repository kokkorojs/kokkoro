import { fileURLToPath, spawn } from 'bun';
import { expect, test } from 'bun:test';
import { join } from 'node:path';

const cli = fileURLToPath(new URL('../src/index.ts', import.meta.url));

test.skipIf(process.platform === 'win32')('SIGINT 终止下级进程', async () => {
  const entry = join(import.meta.dir, 'fixtures', 'signals.ts');
  const child = spawn([process.execPath, cli, 'start', entry], {
    stdout: 'pipe',
    stderr: 'inherit',
  });

  try {
    await child.stdout.getReader().read();
    child.kill('SIGINT');
    expect(await child.exited).toBe(0);
  } finally {
    child.kill('SIGTERM');
    await child.exited;
  }
});
