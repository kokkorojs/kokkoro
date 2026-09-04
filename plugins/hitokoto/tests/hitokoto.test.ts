import { expect, test } from 'bun:test';

import { isErrorResponse, resolveTypeCodes, resolveTypes } from 'kokkoro-plugin-hitokoto/service';

test('类型代码', () => {
  expect(resolveTypeCodes(['动画', '漫画', '游戏'])).toEqual(['a', 'b', 'c']);
  expect(() => resolveTypeCodes(['黄油'])).toThrow('类型「黄油」不是有效值');
});

test('类型参数', () => {
  import.meta.env.HITOKOTO_TYPES = 'a,b,c';

  expect(resolveTypes()).toEqual(['a', 'b', 'c']);
  expect(resolveTypes('a')).toEqual(['a']);
  expect(resolveTypes([])).toEqual([]);
});

test('错误响应', () => {
  expect(isErrorResponse({ status: 400, message: 'error', data: [], ts: 0 })).toBeTrue();
  expect(isErrorResponse({ message: 'error' })).toBeFalse();
});
