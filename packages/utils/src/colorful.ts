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
 * 彩色字体
 *
 * @param color - 字体颜色
 * @param text - 文本
 * @returns 文本内容
 */
export function colorful(color: keyof typeof Color, text: string): string {
  return `\u001b[${color}m${text}\u001b[0m`;
}
