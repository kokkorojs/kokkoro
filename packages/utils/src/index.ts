/**
 * 检测对象是否是 Class
 *
 * @param value - 检测对象
 * @returns 布尔值
 */
export function isClass(value: unknown): boolean {
  if (typeof value !== 'function') {
    return false;
  }
  return value.toString().startsWith('class');
}

/**
 * 字符串转换为数字，可携带 `k` `w` `e` 单位
 *
 * @param value - 字符串
 * @returns 数字结果
 */
export function stringToNumber(value: unknown): number {
  if (typeof value !== 'string') {
    return NaN;
  }
  const number = Number(value);

  if (isNaN(number)) {
    let float = parseFloat(value);
    const units = value.replace(/$\d+/g, '');

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];

      switch (unit) {
        case 'k':
          float *= 1000;
          break;
        case 'w':
          float *= 10000;
          break;
        case 'e':
          float *= 100000000;
          break;
      }
    }
    return float;
  }
  return number;
}

export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
