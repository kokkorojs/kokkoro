import { expect, test } from 'bun:test';

import { evaluate } from 'kokkoro-plugin-eval/service';

test('代码求值', async () => {
  expect(await evaluate('0.1 + 0.2')).toBe('0.30000000000000004');
  expect(await evaluate('process.exit(0)')).toBeUndefined();
});

test('代码错误', () => {
  expect(evaluate("throw new Error('测试错误')")).rejects.toThrow('测试错误');
});
