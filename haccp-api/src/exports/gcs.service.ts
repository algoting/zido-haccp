import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GcsService {
  private readonly logger = new Logger(GcsService.name);
  private storage: Storage;
  private bucketName: string;

  constructor(private config: ConfigService) {
    const projectId = this.config.get<string>('GCP_PROJECT_ID');
    const keyFilename = this.config.get<string>('GCP_KEY_FILE');

    if (!projectId || !keyFilename) {
      this.logger.warn(
        'GCP_PROJECT_ID or GCP_KEY_FILE not set. GCS features will be disabled.',
      );
      return;
    }

    this.storage = new Storage({
      projectId,
      keyFilename,
    });

    this.bucketName =
      this.config.get<string>('GCS_BUCKET_NAME') || 'haccp-exports';
    this.logger.log(`GCS initialized for bucket: ${this.bucketName}`);
  }

  /**
   * Upload a file to Google Cloud Storage
   */
  async uploadFile(
    fileName: string,
    fileBuffer: Buffer,
    contentType: string = 'application/octet-stream',
  ): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      await file.save(fileBuffer, {
        metadata: {
          contentType,
        },
      });

      this.logger.log(`File uploaded to GCS: ${fileName}`);
      return `gs://${this.bucketName}/${fileName}`;
    } catch (error) {
      this.logger.error(`Failed to upload file to GCS: ${error}`);
      throw error;
    }
  }

  /**
   * Generate a signed URL for a file (valid for specified duration)
   */
  async generateSignedUrl(
    fileName: string,
    expiresIn: number = 3600, // 1 hour in seconds
  ): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresIn * 1000,
      });

      this.logger.log(`Generated signed URL for: ${fileName}`);
      return signedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error}`);
      throw error;
    }
  }

  /**
   * Download a file from GCS as buffer
   */
  async downloadFile(fileName: string): Promise<Buffer> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const buffer = await file.download();
      this.logger.log(`Downloaded file from GCS: ${fileName}`);
      return buffer[0];
    } catch (error) {
      this.logger.error(`Failed to download file from GCS: ${error}`);
      throw error;
    }
  }

  /**
   * Delete a file from GCS
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      await file.delete();
      this.logger.log(`Deleted file from GCS: ${fileName}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from GCS: ${error}`);
      throw error;
    }
  }

  /**
   * Check if file exists in GCS
   */
  async fileExists(fileName: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      this.logger.error(`Error checking file existence: ${error}`);
      return false;
    }
  }

  /**
   * Upload PMS document to GCS
   */
  async uploadPmsDocument(
    establishmentId: string,
    fileName: string,
    fileBuffer: Buffer,
  ): Promise<string> {
    const gcsPath = `pms/${establishmentId}/${Date.now()}_${fileName}`;
    return this.uploadFile(gcsPath, fileBuffer, 'application/pdf');
  }

  /**
   * Upload product photo to GCS
   */
  async uploadProductPhoto(
    establishmentId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const gcsPath = `products/${establishmentId}/${Date.now()}_${fileName}`;
    return this.uploadFile(gcsPath, fileBuffer, mimeType);
  }

  /**
   * Upload export PDF to GCS
   */
  async uploadExportPdf(
    establishmentId: string,
    exportJobId: string,
    pdfBuffer: Buffer,
    filename?: string,
  ): Promise<string> {
    const fileName = filename || `${exportJobId}.pdf`;
    const gcsPath = `exports/${establishmentId}/${fileName}`;
    return this.uploadFile(gcsPath, pdfBuffer, 'application/pdf');
  }

  /**
   * Get signed download URL for export (valid 1 hour)
   */
  async getExportDownloadUrl(filePath: string): Promise<string> {
    return this.generateSignedUrl(filePath, 3600); // 1 hour
  }

  /**
   * Get signed download URL for PMS document (valid 1 hour)
   */
  async getPmsDownloadUrl(pmsDocumentId: string): Promise<string> {
    // Assuming the file is stored with a predictable path structure
    // This would need to be adjusted based on actual storage schema
    return this.generateSignedUrl(`pms/${pmsDocumentId}`, 3600);
  }
}
