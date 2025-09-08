/**
 * MinIO 存储服务
 * 提供文件上传、下载、删除等操作
 */

import { Client as MinioClient, BucketItem } from 'minio';

interface MinioConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucketName: string;
  useSSL?: boolean;
  port?: number;
}

interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

export class MinioStorageService {
  private client: MinioClient;
  private bucketName: string;

  constructor(config: MinioConfig) {
    this.bucketName = config.bucketName;
    
    // 解析endpoint和port
    const [host, portStr] = config.endpoint.split(':');
    const port = config.port || (portStr ? parseInt(portStr) : (config.useSSL ? 443 : 80));

    this.client = new MinioClient({
      endPoint: host,
      port: port,
      useSSL: config.useSSL || false,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
  }

  /**
   * 初始化存储桶
   */
  async initialize(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName);
        console.log(`✅ Created bucket: ${this.bucketName}`);
      }
    } catch (error) {
      console.error('❌ Failed to initialize MinIO bucket:', error);
      throw new Error(`MinIO initialization failed: ${error}`);
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const metadata = {
        'upload-timestamp': new Date().toISOString(),
        ...options.metadata,
      };

      const uploadInfo = await this.client.putObject(
        this.bucketName,
        key,
        buffer,
        buffer.length,
        {
          'Content-Type': options.contentType || 'application/octet-stream',
          ...metadata,
        }
      );

      // 获取文件URL
      const url = await this.getFileUrl(key);

      return {
        url,
        key,
        size: buffer.length,
        contentType: options.contentType || 'application/octet-stream',
      };
    } catch (error) {
      console.error('❌ MinIO upload failed:', error);
      throw new Error(`File upload failed: ${error}`);
    }
  }

  /**
   * 获取文件下载URL
   */
  async getFileUrl(key: string, expiry: number = 7 * 24 * 60 * 60): Promise<string> {
    try {
      return await this.client.presignedGetObject(this.bucketName, key, expiry);
    } catch (error) {
      console.error('❌ Failed to get file URL:', error);
      throw new Error(`Failed to get file URL: ${error}`);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, key);
      console.log(`🗑️ Deleted file: ${key}`);
    } catch (error) {
      console.error('❌ Failed to delete file:', error);
      throw new Error(`File deletion failed: ${error}`);
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(key: string) {
    try {
      return await this.client.statObject(this.bucketName, key);
    } catch (error) {
      console.error('❌ Failed to get file info:', error);
      throw new Error(`Failed to get file info: ${error}`);
    }
  }

  /**
   * 列出文件
   */
  async listFiles(prefix?: string): Promise<BucketItem[]> {
    return new Promise((resolve, reject) => {
      const files: BucketItem[] = [];
      const stream = this.client.listObjectsV2(this.bucketName, prefix);

      stream.on('data', (obj) => files.push(obj));
      stream.on('error', reject);
      stream.on('end', () => resolve(files));
    });
  }

  /**
   * 生成唯一文件名
   */
  generateUniqueKey(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = originalName.split('.').pop();
    return `uploads/${userId}/${timestamp}-${random}.${extension}`;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.bucketExists(this.bucketName);
      return true;
    } catch (error) {
      console.error('❌ MinIO health check failed:', error);
      return false;
    }
  }
}

// 创建单例实例
let storageInstance: MinioStorageService | null = null;

export function createStorageService(): MinioStorageService {
  if (storageInstance) {
    return storageInstance;
  }

  const config = {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost:9000',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    bucketName: process.env.MINIO_BUCKET_NAME || 'study-assistant',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  };

  storageInstance = new MinioStorageService(config);
  return storageInstance;
}

export default MinioStorageService;