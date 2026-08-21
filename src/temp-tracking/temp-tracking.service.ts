import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocalFileService } from '../exports/local-file.service';
import { CreateTempTrackingDto } from './dto/create-temp-tracking.dto';
import { UpdateTempTrackingDto } from './dto/update-temp-tracking.dto';

@Injectable()
export class TempTrackingService {
  constructor(
    private prisma: PrismaService,
    private localFileService: LocalFileService,
  ) {}

  async create(
    establishmentId: string,
    userId: string,
    dto: CreateTempTrackingDto,
    photoFile?: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    let photoUrl: string | undefined = undefined;

    if (photoFile) {
      photoUrl = this.localFileService.uploadProductPhoto(
        establishmentId,
        photoFile.originalname || 'temp_tracking.jpg',
        photoFile.buffer,
      );
    }

    const startTemp = typeof dto.startTemp === 'string' ? parseFloat(dto.startTemp) : dto.startTemp;
    const endTemp = dto.endTemp !== undefined && dto.endTemp !== null && dto.endTemp !== ''
      ? (typeof dto.endTemp === 'string' ? parseFloat(dto.endTemp) : dto.endTemp)
      : null;

    return this.prisma.tempTracking.create({
      data: {
        establishmentId,
        action: dto.action,
        productName: dto.productName || null,
        startTime: new Date(dto.startTime),
        startTemp: Number.isNaN(startTemp) ? 0 : startTemp,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        endTemp: endTemp !== null && !Number.isNaN(endTemp) ? endTemp : null,
        photoUrl: photoUrl || null,
        createdByUserId: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(establishmentId: string) {
    return this.prisma.tempTracking.findMany({
      where: { establishmentId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, establishmentId: string, dto: UpdateTempTrackingDto) {
    const existing = await this.prisma.tempTracking.findFirst({
      where: { id, establishmentId },
    });

    if (!existing) {
      throw new NotFoundException('Relevé de température introuvable');
    }

    const endTemp = dto.endTemp !== undefined && dto.endTemp !== null && dto.endTemp !== ''
      ? (typeof dto.endTemp === 'string' ? parseFloat(dto.endTemp) : dto.endTemp)
      : undefined;

    return this.prisma.tempTracking.update({
      where: { id },
      data: {
        ...(dto.endTime && { endTime: new Date(dto.endTime) }),
        ...(endTemp !== undefined && { endTemp: Number.isNaN(endTemp) ? null : endTemp }),
        ...(dto.productName !== undefined && { productName: dto.productName }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });
  }

  async delete(id: string, establishmentId: string) {
    const existing = await this.prisma.tempTracking.findFirst({
      where: { id, establishmentId },
    });

    if (!existing) {
      throw new NotFoundException('Relevé de température introuvable');
    }

    await this.prisma.tempTracking.delete({
      where: { id },
    });

    return { success: true };
  }
}
