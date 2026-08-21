import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalFileService {
  private readonly logger = new Logger(LocalFileService.name);
  private readonly exportsDir = path.join(process.cwd(), 'uploads', 'exports');
  private readonly pmsDir = path.join(process.cwd(), 'uploads', 'pms');
  private readonly productsDir = path.join(
    process.cwd(),
    'uploads',
    'products',
  );

  constructor() {
    // Ensure uploads directories exist
    [this.exportsDir, this.pmsDir, this.productsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created uploads directory: ${dir}`);
      }
    });
  }

  /**
   * Save a PDF export file locally
   */
  uploadExportPdf(
    establishmentId: string,
    jobId: string,
    pdfBuffer: Buffer,
    filename?: string,
  ): string {
    try {
      // Generate filename: establishment_name_month_year.pdf or use custom
      const fileName = filename || `export_${jobId}.pdf`;
      const filePath = path.join(this.exportsDir, establishmentId, fileName);

      // Create establishment directory if it doesn't exist
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(filePath, pdfBuffer);
      this.logger.log(`Local file saved: ${filePath}`);

      // Return a URL-friendly path that works with the uploads endpoint
      return `/uploads/exports/${establishmentId}/${fileName}`;
    } catch (error) {
      this.logger.error(`Failed to save file locally: ${error}`);
      throw error;
    }
  }

  /**
   * Save a PMS document file locally
   */
  uploadPmsDocument(
    establishmentId: string,
    fileName: string,
    fileBuffer: Buffer,
  ): string {
    try {
      const filePath = path.join(
        this.pmsDir,
        establishmentId,
        `${Date.now()}_${fileName}`,
      );

      // Create establishment directory if it doesn't exist
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(filePath, fileBuffer);
      this.logger.log(`PMS document saved locally: ${filePath}`);

      // Return a URL-friendly path that works with the uploads endpoint
      const justFilename = path.basename(filePath);
      return `/uploads/pms/${establishmentId}/${justFilename}`;
    } catch (error) {
      this.logger.error(`Failed to save PMS document locally: ${error}`);
      throw error;
    }
  }

  /**
   * Save a product photo locally
   */
  uploadProductPhoto(
    establishmentId: string,
    fileName: string,
    fileBuffer: Buffer,
  ): string {
    try {
      const filePath = path.join(
        this.productsDir,
        establishmentId,
        `${Date.now()}_${fileName}`,
      );

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, fileBuffer);
      this.logger.log(`Product photo saved locally: ${filePath}`);

      const justFilename = path.basename(filePath);
      return `/uploads/products/${establishmentId}/${justFilename}`;
    } catch (error) {
      this.logger.error(`Failed to save product photo locally: ${error}`);
      throw error;
    }
  }

  /**
   * Get file path for local storage
   */
  getFilePath(establishmentId: string, exportJobId: string): string {
    return path.join(this.exportsDir, establishmentId, `${exportJobId}.pdf`);
  }

  /**
   * Check if file exists locally
   */
  fileExists(establishmentId: string, exportJobId: string): boolean {
    const filePath = this.getFilePath(establishmentId, exportJobId);
    return fs.existsSync(filePath);
  }

  /**
   * Download file from local storage
   */
  downloadFile(establishmentId: string, exportJobId: string): Buffer {
    const filePath = this.getFilePath(establishmentId, exportJobId);

    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    return fs.readFileSync(filePath);
  }
}
