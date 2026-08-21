import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { Product, ProductPhoto } from '@prisma/client';
import { GcsService } from '../exports/gcs.service';
import { LocalFileService } from '../exports/local-file.service';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';

@Injectable()
export class TraceabilityService {
  private readonly logger = new Logger(TraceabilityService.name);
  private readonly gcsEnabled: boolean;

  constructor(
    private prisma: PrismaService,
    private gcs: GcsService,
    private localFile: LocalFileService,
    private config: ConfigService,
  ) {
    const projectId = this.config.get<string>('GCP_PROJECT_ID');
    const keyFile = this.config.get<string>('GCP_KEY_FILE');
    this.gcsEnabled = !!(projectId && keyFile);
  }

  private sanitizeFilename(originalName: string): string {
    const extIndex = originalName.lastIndexOf('.');
    const ext = extIndex >= 0 ? originalName.substring(extIndex) : '';
    const nameWithoutExt =
      extIndex >= 0 ? originalName.substring(0, extIndex) : originalName;
    const sanitizedName = nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `${sanitizedName || 'product_photo'}${ext.toLowerCase()}`;
  }

  async uploadProductPhoto(
    establishmentId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<string> {
    if (!fileBuffer || !originalName) {
      throw new BadRequestException('Invalid product photo upload');
    }

    const sanitizedName = this.sanitizeFilename(originalName);

    if (this.gcsEnabled) {
      return this.gcs.uploadProductPhoto(
        establishmentId,
        sanitizedName,
        fileBuffer,
        mimeType,
      );
    }

    return this.localFile.uploadProductPhoto(
      establishmentId,
      sanitizedName,
      fileBuffer,
    );
  }

  /**
   * Create a new product with traceability information
   */
  async createProduct(
    establishmentId: string,
    createdBy: string,
    dto: CreateProductDto,
  ) {
    try {
      const noExpirySentinel = new Date('9999-12-31T00:00:00.000Z');
      const createData: any = {
        establishmentId,
        createdBy,
        name: dto.name,
        supplier: dto.supplier || '',
        batchNumber: dto.batchNumber || '',
        expiryDate: dto.expiryDate
          ? new Date(dto.expiryDate)
          : noExpirySentinel,
        quantity: dto.quantity || 0,
        quantityUnit: dto.quantityUnit || 'kg',
        storageLocation: dto.storageLocation || '',
        classification: dto.classification || '',
      };

      const product = await this.prisma.product.create({
        data: createData,
        include: {
          photos: true,
          creator: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(
        `Product "${dto.name}" created for establishment ${establishmentId}`,
      );
      return product;
    } catch (error) {
      this.logger.error(`Failed to create product: ${error}`);
      throw error;
    }
  }

  /**
   * Get all products for an establishment
   */
  async getProductsByEstablishment(
    establishmentId: string,
    skip = 0,
    take = 20,
  ) {
    try {
      return await this.prisma.product.findMany({
        where: { establishmentId },
        include: {
          photos: true,
          creator: {
            select: {
              displayName: true,
              email: true,
              id: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });
    } catch (error) {
      this.logger.error(
        `Failed to get products for establishment ${establishmentId}: ${error}`,
      );
      throw error;
    }
  }

  async getProductsCount(establishmentId: string): Promise<number> {
    return this.prisma.product.count({ where: { establishmentId } });
  }

  /**
   * Get a single product by ID with full details
   */
  async getProductById(
    productId: string,
    establishmentId: string,
  ) {
    try {
      const product = await this.prisma.product.findFirstOrThrow({
        where: { id: productId, establishmentId },
        include: {
          photos: {
            orderBy: { uploadedAt: 'asc' },
          },
          creator: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      return product;
    } catch (error) {
      this.logger.error(`Failed to get product ${productId}: ${error}`);
      throw error;
    }
  }

  /**
   * Add a photo to an existing product
   */
  async addProductPhoto(
    productId: string,
    establishmentId: string,
    photoUrl: string,
  ): Promise<ProductPhoto> {
    try {
      // Verify product exists and belongs to this establishment
      await this.prisma.product.findFirstOrThrow({
        where: { id: productId, establishmentId },
      });

      const photo = await this.prisma.productPhoto.create({
        data: {
          productId,
          photoUrl,
        },
      });

      this.logger.log(`Photo added to product ${productId}`);
      return photo;
    } catch (error) {
      this.logger.error(`Failed to add photo to product: ${error}`);
      throw error;
    }
  }

  /**
   * Delete a product (only by OWNER)
   */
  async deleteProduct(
    productId: string,
    establishmentId: string,
  ): Promise<void> {
    try {
      // First, delete all photos
      await this.prisma.productPhoto.deleteMany({
        where: { product: { id: productId, establishmentId } },
      });

      // Then delete the product
      await this.prisma.product.deleteMany({
        where: { id: productId, establishmentId },
      });

      this.logger.log(`Product ${productId} deleted`);
    } catch (error) {
      this.logger.error(`Failed to delete product ${productId}: ${error}`);
      throw error;
    }
  }

  /**
   * Get products by supplier (for traceability queries)
   */
  async getProductsBySupplier(
    establishmentId: string,
    supplier: string,
  ): Promise<Product[]> {
    try {
      return await this.prisma.product.findMany({
        where: {
          establishmentId,
          supplier: {
            contains: supplier,
            mode: 'insensitive',
          },
        },
        include: {
          photos: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to search products by supplier: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Generate a printable PDF label for a product (same format as DLC label)
   */
  async generateProductLabelPDF(
    product: any,
    frontendUrl: string,
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const qrDataUrl = await QRCode.toDataURL(`${frontendUrl}/traceability`, {
          errorCorrectionLevel: 'H',
          width: 200,
          margin: 1,
        });

        // 8cm x 3.4cm — same size as DLC label
        const doc = new PDFDocument({
          size: [227, 97],
          margins: { top: 5, bottom: 5, left: 5, right: 5 },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const noExpirySentinel = 9998;
        const expiryDate = product.expiryDate ? new Date(product.expiryDate) : null;
        const hasExpiry = !!expiryDate && expiryDate.getFullYear() < noExpirySentinel;
        const dlcText = hasExpiry
          ? expiryDate.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
          : 'Non périmé';

        const receptionDate = new Date(product.createdAt).toLocaleString('fr-FR', {
          dateStyle: 'short',
          timeStyle: 'short',
        });

        // QR Code (left side)
        const qrSize = 75;
        const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrBuffer = Buffer.from(qrBase64, 'base64');
        doc.image(qrBuffer, 5, 5, { width: qrSize, height: qrSize });

        // Text column (right side)
        const textX = 5 + qrSize + 5;
        const textWidth = 227 - textX - 5;

        // Product name
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a1a')
          .text(product.name, textX, 8, { width: textWidth });

        // Reception date
        doc.fontSize(10).font('Helvetica').fillColor('#333333')
          .text(`Reçu: ${receptionDate}`, textX, 32, { width: textWidth });

        // DLC date (red bold)
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#850d0d')
          .text(`DLC: ${dlcText}`, textX, 50, { width: textWidth });

        // Quantity
        if (product.quantity) {
          doc.fontSize(9).font('Helvetica').fillColor('#555555')
            .text(`Qté: ${product.quantity} ${product.quantityUnit || ''}`, textX, 67, { width: textWidth });
        }

        // Created by
        const createdByName = product.creator
          ? (product.creator.displayName || product.creator.email)
          : '';
        if (createdByName) {
          doc.fontSize(8).font('Helvetica').fillColor('#777777')
            .text(`Par: ${createdByName}`, textX, 80, { width: textWidth });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get products expiring soon (within days)
   */
  async getExpiringProductsSoon(
    establishmentId: string,
    daysUntilExpiry = 7,
  ): Promise<Product[]> {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysUntilExpiry);

      return await this.prisma.product.findMany({
        where: {
          establishmentId,
          expiryDate: {
            gte: today,
            lte: futureDate,
          },
        },
        include: {
          photos: true,
        },
        orderBy: { expiryDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get expiring products: ${error}`);
      throw error;
    }
  }
}
