import { join } from 'path';
import { Database } from '@kokkoro/jsondb';

export function createDatabase(path: string) {
  return new Database(join(__dbname, path));
}
