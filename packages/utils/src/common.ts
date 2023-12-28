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
