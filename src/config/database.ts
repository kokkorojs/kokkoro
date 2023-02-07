import { join } from 'path';
import { Database as DB } from '@kokkoro/jsondb';

export class Database extends DB {
  constructor(path: string) {
    path = join(__dbname, path);

    super(path);
  }
}
