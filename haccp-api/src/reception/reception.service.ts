import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceptionDto } from './dto/create-reception.dto';
import { UpdateReceptionDto } from './dto/update-reception.dto';
import { GcsService } from '../exports/gcs.service';
import { LocalFileService } from '../exports/local-file.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReceptionService {
  private readonly logger = new Logger(ReceptionService.name);
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
    const nameWithoutExt = extIndex >= 0 ? originalName.substring(0, extIndex) : originalName;
    const sanitizedName = nameWithoutExt.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return `${sanitizedName || 'reception_photo'}${ext.toLowerCase()}`;
  }

  async uploadReceptionPhoto(
    establishmentId: string, fileBuffer: Buffer, originalName: string, mimeType: string,
  ): Promise<string> {
    if (!fileBuffer || !originalName) throw new BadRequestException('Invalid photo upload');
    const sanitizedName = this.sanitizeFilename(originalName);
    if (this.gcsEnabled) {
      return this.gcs.uploadProductPhoto(establishmentId, sanitizedName, fileBuffer, mimeType);
    }
    return this.localFile.uploadProductPhoto(establishmentId, sanitizedName, fileBuffer);
  }

  async create(establishmentId: string, createdBy: string, dto: CreateReceptionDto) {
    // Verify supplier belongs to same establishment
    await this.prisma.supplier.findFirstOrThrow({
      where: { id: dto.supplierId, establishmentId },
    });

    return this.prisma.goodsReception.create({
      data: {
        establishmentId,
        createdBy,
        supplierId: dto.supplierId,
        category: dto.category,
        temperature: dto.temperature ?? null,
        orderNumber: dto.orderNumber || null,
        invoiceNumber: dto.invoiceNumber || null,
        packagingOk: dto.packagingOk ?? true,
      },
      include: { supplier: true, photos: true, creator: { select: { id: true, displayName: true, email: true } } },
    });
  }

  async findAll(establishmentId: string, skip = 0, take = 20) {
    return this.prisma.goodsReception.findMany({
      where: { establishmentId },
      include: {
        supplier: true,
        photos: true,
        creator: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async findOne(id: string, establishmentId: string) {
    return this.prisma.goodsReception.findFirstOrThrow({
      where: { id, establishmentId },
      include: {
        supplier: true,
        photos: { orderBy: { uploadedAt: 'asc' } },
        creator: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  async addPhoto(receptionId: string, establishmentId: string, photoUrl: string) {
    await this.prisma.goodsReception.findFirstOrThrow({
      where: { id: receptionId, establishmentId },
    });
    return this.prisma.goodsReceptionPhoto.create({
      data: { receptionId, photoUrl },
    });
  }

  async update(id: string, establishmentId: string, dto: UpdateReceptionDto) {
    await this.prisma.goodsReception.findFirstOrThrow({
      where: { id, establishmentId },
    });

    if (dto.supplierId) {
      await this.prisma.supplier.findFirstOrThrow({
        where: { id: dto.supplierId, establishmentId },
      });
    }

    return this.prisma.goodsReception.update({
      where: { id },
      data: {
        ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.temperature !== undefined && { temperature: dto.temperature }),
        ...(dto.orderNumber !== undefined && { orderNumber: dto.orderNumber || null }),
        ...(dto.invoiceNumber !== undefined && { invoiceNumber: dto.invoiceNumber || null }),
        ...(dto.packagingOk !== undefined && { packagingOk: dto.packagingOk }),
      },
      include: {
        supplier: true,
        photos: true,
        creator: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  async remove(id: string, establishmentId: string) {
    await this.prisma.goodsReceptionPhoto.deleteMany({
      where: { reception: { id, establishmentId } },
    });
    await this.prisma.goodsReception.deleteMany({
      where: { id, establishmentId },
    });
  }

  async count(establishmentId: string) {
    return this.prisma.goodsReception.count({ where: { establishmentId } });
  }
}
