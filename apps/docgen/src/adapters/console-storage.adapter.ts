import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import type { StoragePort } from '../shared/ports/storage.port';

/** Local-disk stub — mirrors ConsoleMessagingAdapter / ConsoleAiAdapter pattern. */
@Injectable()
export class ConsoleStorageAdapter implements StoragePort {
  private readonly logger = new Logger(ConsoleStorageAdapter.name);
  private readonly root = process.env.DOCGEN_STORAGE_DIR ?? join(process.cwd(), '.docgen-storage');

  async putObject(key: string, body: Buffer, contentType: string): Promise<string> {
    mkdirSync(this.root, { recursive: true });
    const safeKey = key.replace(/[^a-zA-Z0-9._/-]/g, '_');
    const path = join(this.root, safeKey);
    const dir = path.slice(0, path.lastIndexOf('/'));
    if (dir && dir !== this.root) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(path, body);
    this.logger.log(`[dev stub] stored ${safeKey} (${body.length} bytes, ${contentType})`);
    return `file://${path}`;
  }

  async getSignedUrl(key: string): Promise<string> {
    const safeKey = key.replace(/[^a-zA-Z0-9._/-]/g, '_');
    return `file://${join(this.root, safeKey)}`;
  }
}
