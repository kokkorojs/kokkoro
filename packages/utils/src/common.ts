/**
 * 创建只读 Map
 *
 * @param map - Map 对象
 * @returns 只读对象
 */
export function createReadonlyMap<T extends Map<number | string, unknown>>(map: T): T {
  const proxy = new Proxy(map, {
    set(): false {
      return false;
    },
    get(target, property): unknown {
      const value = Reflect.get(target, property);

      if (typeof value !== 'function') {
        return value;
      }

      switch (property) {
        case 'set':
        case 'clear':
        case 'delete':
          return none;
        default:
          return value.bind(target);
      }
    },
  });

  return proxy;
}

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

export function none(): void {}

/**
 * 对象转换为字符串
 *
 * @param value - 对象
 * @returns 字符串结果
 */
export function objectToString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value, null, 2);
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
