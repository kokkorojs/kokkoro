import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { root, working } from '@/index.js';

interface Package {
  name: string;
  version: string;
}

export async function getVersion(): Promise<string> {
  const path = join(root, 'package.json');
  const text = await readFile(path, 'utf-8');
  const { version } = <Package>JSON.parse(text);

  return version;
}

export function hasConfig(): boolean {
  const path = join(working, 'kokkoro.json');
  return existsSync(path);
}
