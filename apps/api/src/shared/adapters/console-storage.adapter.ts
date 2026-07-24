import { Injectable, Logger } from '@nestjs/common';
import { StoragePort } from '../ports/storage.port';

/**
 * Console-logging stub adapter for StoragePort
 * Used in development/testing before Cloudflare R2 credentials are available
 */
@Injectable()
export class ConsoleStorageAdapter implements StoragePort {
  private readonly logger = new Logger(ConsoleStorageAdapter.name);

  async uploadFile(
    bucket: string,
    key: string,
    content: Buffer | NodeJS.ReadableStream,
    contentType: string,
  ): Promise<{ key: string; url: string }> {
    const size = Buffer.isBuffer(content) ? content.length : 'stream';
    this.logger.log(
      `[STUB] Upload: bucket=${bucket}, key=${key}, type=${contentType}, size=${size}`,
    );

    // Return stub URL
    return {
      key,
      url: `https://stub-storage.local/${bucket}/${key}`,
    };
  }

  async getSignedUrl(bucket: string, key: string, expiresIn: number): Promise<string> {
    this.logger.log(
      `[STUB] Signed URL: bucket=${bucket}, key=${key}, expires=${expiresIn}s`,
    );

    // Return stub signed URL with expiry timestamp
    const expiryTimestamp = Date.now() + expiresIn * 1000;
    return `https://stub-storage.local/${bucket}/${key}?expires=${expiryTimestamp}`;
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    this.logger.log(`[STUB] Delete: bucket=${bucket}, key=${key}`);
  }

  async fileExists(bucket: string, key: string): Promise<boolean> {
    this.logger.log(`[STUB] Exists check: bucket=${bucket}, key=${key}`);
    // Always return true for stub to allow development to proceed
    return true;
  }

  async listFiles(bucket: string, prefix?: string): Promise<string[]> {
    this.logger.log(`[STUB] List files: bucket=${bucket}, prefix=${prefix || '(none)'}`);
    // Return empty array for stub
    return [];
  }
}
