enum Color {
  Red = 31,
  Green = 32,
  Yellow = 33,
  Blue = 34,
  Magenta = 35,
  Cyan = 36,
  White = 37,
}

/**
 * 生成彩色字体
 *
 * @param type - 颜色
 * @param text - 文本
 * @returns 彩色字体
 */
export function colorful(type: keyof typeof Color, text: string): string {
  return `\u001b[${Color[type]}m${text}\u001b[0m`;
}
