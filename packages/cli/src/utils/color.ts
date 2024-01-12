enum Type {
  Black = 30,
  Red = 31,
  Green = 32,
  Yellow = 33,
  Blue = 34,
  Magenta = 35,
  Cyan = 36,
  White = 37,
  BlackBg = 40,
  RedBg = 41,
  GreenBg = 42,
  YellowBg = 43,
  BlueBg = 44,
  MagentaBg = 45,
  CyanBg = 46,
  WhiteBg = 47,
}

/**
 * 生成彩色文字
 *
 * @param text - 文字
 * @param types - 颜色类型
 * @returns 彩色文字
 */
export function colorful(text: string, ...types: (keyof typeof Type)[]): string {
  const style = types.map(type => Type[type]).join(';');
  return `\u001b[${style}m${text}\u001b[0m`;
}

export function black(text: string): string {
  return colorful(text, 'Black');
}

export function red(text: string): string {
  return colorful(text, 'Red');
}

export function green(text: string): string {
  return colorful(text, 'Green');
}

export function yellow(text: string): string {
  return colorful(text, 'Yellow');
}

export function blue(text: string): string {
  return colorful(text, 'Blue');
}

export function magenta(text: string): string {
  return colorful(text, 'Magenta');
}

export function cyan(text: string): string {
  return colorful(text, 'Cyan');
}

export function white(text: string): string {
  return colorful(text, 'White');
}
