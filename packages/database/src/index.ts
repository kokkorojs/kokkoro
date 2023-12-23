import { join } from 'node:path';
import { ClassicLevel, DatabaseOptions } from 'classic-level';

export interface DatabaseError {
  code: string;
  notFound: boolean;
  status: number;
}

type Callback<T> = (error: DatabaseError | null, result?: T) => void;

export interface Database<T = Record<string, string>> extends ClassicLevel<keyof T, T[keyof T]> {
  get<K extends keyof T>(key: K): Promise<T[K]>;
  get<K extends keyof T>(key: K, callback: Callback<T[K]>): void;

  put<K extends keyof T>(key: K, value: T[K]): Promise<void>;
  put<K extends keyof T>(key: K, value: T[K], callback: Callback<void>): void;
}

export class Database<T = Record<string, string>> extends ClassicLevel<keyof T, T[keyof T]> {
  constructor(location: string, options?: DatabaseOptions<keyof T, T[keyof T]>) {
    location = join(process.cwd(), 'db', location);
    super(location, options);
  }

  has<K extends keyof T>(key: K, callback?: (exist: boolean) => void): void | Promise<boolean> {
    if (callback) {
      return this.get(key, error => {
        if (!error) {
          return callback(true);
        }
        const { code, notFound } = error;

        if (notFound) {
          return callback(false);
        }
        throw new Error(code);
      });
    }

    return new Promise((resolve, reject) => {
      this.get(key, error => {
        if (!error) {
          return resolve(true);
        }
        const { code, notFound } = error;

        if (notFound) {
          return resolve(false);
        }
        reject(code);
      });
    });
  }
}
