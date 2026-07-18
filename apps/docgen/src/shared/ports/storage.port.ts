export interface StoragePort {
  putObject(key: string, body: Buffer, contentType: string): Promise<string>;
  getSignedUrl(key: string): Promise<string>;
}

export const STORAGE_PORT = Symbol('STORAGE_PORT');
