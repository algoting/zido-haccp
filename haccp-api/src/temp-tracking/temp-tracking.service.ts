import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TempTrackingAction } from '@prisma/client';
import { GcsService } from '../exports/gcs.service';
import { LocalFileService } from '../exports/local-file.service';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class TempTrackingService {
  private readonly gcsEnabled: boolean;

  constructor(
    private prisma: PrismaService,
    private gcsService: GcsService,
    private localFileService: LocalFileService,
    private config: ConfigService,
  ) {
    this.gcsEnabled = !!config.get('GCS_BUCKET_NAME');
  }

  async create(data: {
    action: TempTrackingAction;
    productName?: string;
    photoUrl?: string;
    startTime: Date;
    startTemp: number;
    endTime?: Date;
    endTemp?: number;
    establishmentId: string;
    createdByUserId: string;
  }) {
    return this.prisma.tempTracking.create({
      data: {
        action: data.action,
        productName: data.productName,
        photoUrl: data.photoUrl,
        startTime: data.startTime,
        startTemp: data.startTemp,
        endTime: data.endTime,
        endTemp: data.endTemp,
        establishmentId: data.establishmentId,
        createdByUserId: data.createdByUserId,
      },
      include: {
        createdBy: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  async list(establishmentId: string) {
    return this.prisma.tempTracking.findMany({
      where: { establishmentId },
      include: {
        createdBy: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, establishmentId: string, data: { endTime?: Date; endTemp?: number }) {
    const record = await this.prisma.tempTracking.findFirst({ where: { id, establishmentId } });
    if (!record) throw new NotFoundException('Record not found');

    return this.prisma.tempTracking.update({
      where: { id },
      data: { endTime: data.endTime, endTemp: data.endTemp },
      include: {
        createdBy: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  async delete(id: string, establishmentId: string) {
    const record = await this.prisma.tempTracking.findFirst({ where: { id, establishmentId } });
    if (!record) throw new NotFoundException('Record not found');
    await this.prisma.tempTracking.delete({ where: { id } });
  }

  async uploadPhoto(establishmentId: string, buffer: Buffer, originalname: string, mimetype: string): Promise<string> {
    const ext = path.extname(originalname) || '.jpg';
    const filename = `temp_${crypto.randomBytes(8).toString('hex')}${ext}`;
    if (this.gcsEnabled) {
      return this.gcsService.uploadProductPhoto(establishmentId, filename, buffer, mimetype);
    }
    return this.localFileService.uploadProductPhoto(establishmentId, filename, buffer);
  }
}
