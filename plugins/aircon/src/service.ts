import { Database } from '@kokkoro/database';

interface Aircon {
  power: boolean;
  temp: number;
}

const db = new Database<Record<string, Aircon>>('aircon', {
  valueEncoding: 'json',
});

function getTempIcon(temp: number): string {
  let emoji;

  switch (true) {
    case temp < 1:
      emoji = '🥶';
      break;
    case temp < 26:
      emoji = '❄️';
      break;
    case temp < 40:
      emoji = '☀️';
      break;
    case temp <= 100:
      emoji = '🥵';
      break;
    case temp <= 6000:
      emoji = '💀';
      break;
    default:
      throw new Error('Invalid temp.');
  }
  return emoji;
}

async function installAircon(id: string): Promise<void> {
  const has_info = await db.has(id);

  if (!has_info) {
    await db.put(id, { temp: 24, power: false });
  }
}

export async function openAircon(id: string): Promise<string> {
  await installAircon(id);
  const aircon = await db.get(id);

  if (aircon.power) {
    return '空调开着呢！';
  }
  aircon.power = true;
  await db.put(id, aircon);

  const emoji = getTempIcon(aircon.temp);
  return `哔~\n${emoji} 当前温度 ${aircon.temp} ℃`;
}

export async function closeAircon(id: string): Promise<string> {
  await installAircon(id);
  const aircon = await db.get(id);

  if (!aircon.power) {
    return '空调关着呢！';
  }
  aircon.power = false;
  await db.put(id, aircon);

  return `哔~\n💤 当前温度 ${aircon.temp} ℃`;
}

export async function getTemp(id: string) {
  await installAircon(id);
  const aircon = await db.get(id);

  if (!aircon.power) {
    return '空调关着呢！';
  }
  const emoji = getTempIcon(aircon.temp);
  return `${emoji} 当前温度 ${aircon.temp} ℃`;
}

export async function setTemp(id: string, temp: number) {
  await installAircon(id);
  const aircon = await db.get(id);

  if (!aircon.power) {
    return '空调关着呢！';
  }

  switch (true) {
    case isNaN(temp):
      return '请输入正确的数值';
    case temp === aircon.temp:
      return `当前已设置 ${aircon.temp}℃`;
    case temp === 114514:
      return '这空调怎么这么臭（恼）';
    case temp > 6000:
      return '温度最高不能超过 6000℃ 哦';
    case temp < -273:
      return '温度最少不能低于 -273℃ 哦';
    default:
      const emoji = getTempIcon(temp);
      aircon.temp = temp;
      await db.put(id, aircon);
      return `${emoji} 当前温度 ${temp}℃`;
  }
}
