/**
 * Storage port for file operations (photos, PDFs, DOCX).
 * Production: Cloudflare R2 adapter
 * Development/Stub: Console logging adapter
 */

export interface StoragePort {
  /**
   * Upload a file to storage
   * @param bucket - Storage bucket name
   * @param key - File key/path
   * @param content - File content (Buffer or Stream)
   * @param contentType - MIME type
   * @returns Upload result with key and URL
   */
  uploadFile(
    bucket: string,
    key: string,
    content: Buffer | NodeJS.ReadableStream,
    contentType: string,
  ): Promise<{ key: string; url: string }>;

  /**
   * Generate a signed URL for temporary access
   * @param bucket - Storage bucket name
   * @param key - File key/path
   * @param expiresIn - Expiry time in seconds
   * @returns Signed URL
   */
  getSignedUrl(bucket: string, key: string, expiresIn: number): Promise<string>;

  /**
   * Delete a file from storage
   * @param bucket - Storage bucket name
   * @param key - File key/path
   */
  deleteFile(bucket: string, key: string): Promise<void>;

  /**
   * Check if a file exists
   * @param bucket - Storage bucket name
   * @param key - File key/path
   */
  fileExists(bucket: string, key: string): Promise<boolean>;

  /**
   * List files in a bucket with optional prefix
   * @param bucket - Storage bucket name
   * @param prefix - Optional key prefix to filter results
   * @returns Array of file keys
   */
  listFiles(bucket: string, prefix?: string): Promise<string[]>;
}

export const STORAGE_PORT = Symbol('STORAGE_PORT');
