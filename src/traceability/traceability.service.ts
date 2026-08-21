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
        classification: dto.classification || null,
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

  /**
   * Generate printable ticket/label PDF for a product
   */
  async generateProductLabelPDF(
    productId: string,
    establishmentId: string,
    frontendUrl: string,
  ): Promise<Buffer> {
    const product = await this.getProductById(productId, establishmentId);
    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
    });

    return new Promise(async (resolve, reject) => {
      try {
        const qrUrl = `${frontendUrl}/traceability?product=${product.id}`;
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          errorCorrectionLevel: 'M',
          width: 200,
          margin: 1,
        });

        const doc = new PDFDocument({
          size: [260, 140],
          margins: { top: 6, bottom: 6, left: 6, right: 6 },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Card Border
        doc.rect(4, 4, 252, 132).lineWidth(1).strokeColor('#cbd5e1').stroke();

        // Top Header
        doc.rect(4, 4, 252, 22).fillColor('#1e293b').fill();
        doc
          .fillColor('#ffffff')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(establishment?.name || 'ZIDO HACCP', 10, 9, { width: 240, align: 'center' });

        // Left side: QR Code
        const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrBuffer = Buffer.from(qrBase64, 'base64');
        const qrSize = 65;
        doc.image(qrBuffer, 10, 34, { width: qrSize, height: qrSize });

        doc
          .fillColor('#64748b')
          .fontSize(6)
          .font('Helvetica-Bold')
          .text('TRAÇABILITÉ HACCP', 10, 103, { width: qrSize, align: 'center' });

        // Right side: Product Information
        const rightX = 82;
        const rightWidth = 170;
        let curY = 32;

        // Product Name
        doc
          .fillColor('#0f172a')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(product.name, rightX, curY, { width: rightWidth, ellipsis: true });
        curY += 14;

        // Supplier
        if (product.supplier) {
          doc
            .fillColor('#334155')
            .fontSize(8)
            .font('Helvetica')
            .text(`Fournisseur: ${product.supplier}`, rightX, curY, { width: rightWidth, ellipsis: true });
          curY += 12;
        }

        // Batch Number
        if (product.batchNumber) {
          doc
            .fillColor('#334155')
            .fontSize(8)
            .font('Helvetica')
            .text(`N° Lot: ${product.batchNumber}`, rightX, curY, { width: rightWidth, ellipsis: true });
          curY += 12;
        }

        // Quantity
        if (product.quantity > 0) {
          doc
            .fillColor('#334155')
            .fontSize(8)
            .font('Helvetica')
            .text(`Quantité: ${product.quantity} ${product.quantityUnit || 'kg'}`, rightX, curY, { width: rightWidth });
          curY += 12;
        }

        // Storage Location
        if (product.storageLocation) {
          doc
            .fillColor('#334155')
            .fontSize(8)
            .font('Helvetica')
            .text(`Stockage: ${product.storageLocation}`, rightX, curY, { width: rightWidth, ellipsis: true });
          curY += 12;
        }

        // Dates: Reception & DLC
        const receptionDate = new Date(product.createdAt).toLocaleDateString('fr-FR');
        doc
          .fillColor('#475569')
          .fontSize(7.5)
          .font('Helvetica')
          .text(`Reçu le: ${receptionDate}`, rightX, curY, { width: rightWidth });
        curY += 11;

        const isSentinel = new Date(product.expiryDate).getFullYear() >= 9000;
        if (!isSentinel) {
          const dlcFormatted = new Date(product.expiryDate).toLocaleDateString('fr-FR');
          doc
            .fillColor('#b91c1c')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(`DLC: ${dlcFormatted}`, rightX, curY, { width: rightWidth });
        } else {
          doc
            .fillColor('#15803d')
            .fontSize(8)
            .font('Helvetica-Bold')
            .text('DLC: Non périssable', rightX, curY, { width: rightWidth });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

