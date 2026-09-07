import { spawn } from 'bun';

const child = spawn([process.execPath, '--eval', 'setInterval(() => {}, 1000); console.log("ready");'], {
  stdout: 'pipe',
  stderr: 'inherit',
  timeout: 2000,
  killSignal: 'SIGKILL',
});

// 阻止入口进程提前退出，以验证下级进程的退出信号。
process.on('SIGINT', () => {});
await child.stdout.getReader().read();
console.log('ready');
await child.exited;
process.exitCode = child.signalCode === 'SIGINT' ? 0 : 1;
