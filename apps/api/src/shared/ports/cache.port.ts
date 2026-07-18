export interface CachePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

export const CACHE_PORT = Symbol('CACHE_PORT');
