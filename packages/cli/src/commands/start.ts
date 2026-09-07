import { spawn } from 'bun';
import { resolve } from 'node:path';

import { Command } from 'komut';

@Command({
  name: 'start',
  args: '[file]',
  description: 'Start the Kokkoro service',
})
export default class StartCommand {
  public constructor(file = 'main.ts') {
    const child = spawn([process.execPath, 'run', resolve(file)], {
      stdio: ['inherit', 'inherit', 'inherit'],
      detached: true,
    });

    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT'] as const) {
      process.on(signal, () => {
        if (process.platform === 'win32') {
          child.kill(signal);
        } else {
          process.kill(-child.pid, signal);
        }
      });
    }
    child.exited.then(code => {
      process.exitCode = code;
    });
  }
}
