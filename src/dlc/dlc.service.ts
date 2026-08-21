import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocalFileService } from '../exports/local-file.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import type {
  InternalPreparation,
  PreparationBatch,
} from '@prisma/client';
import {
  BatchStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class DlcService {
  constructor(
    private prisma: PrismaService,
    private localFileService: LocalFileService,
  ) {}

  // ============================================
  // INTERNAL PREPARATIONS (Owner functions)
  // ============================================

  async createInternalPreparation(data: {
    name: string;
    category: string;
    shelfLifeDays: number;
    shelfLifeHours: number;
    establishmentId: string;
    createdByUserId: string;
  }): Promise<InternalPreparation> {
    return this.prisma.internalPreparation.create({
      data,
    });
  }

  async listInternalPreparations(
    establishmentId: string,
  ): Promise<InternalPreparation[]> {
    return this.prisma.internalPreparation.findMany({
      where: { establishmentId },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        _count: {
          select: {
            batches: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInternalPreparation(id: string, establishmentId: string): Promise<InternalPreparation | null> {
    return this.prisma.internalPreparation.findFirst({
      where: { id, establishmentId },
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

  async updateInternalPreparation(
    id: string,
    establishmentId: string,
    data: {
      name?: string;
      category?: string;
      shelfLifeDays?: number;
      shelfLifeHours?: number;
    },
  ): Promise<InternalPreparation> {
    const prep = await this.prisma.internalPreparation.findFirst({ where: { id, establishmentId } });
    if (!prep) throw new NotFoundException('Préparation interne non trouvée');
    return this.prisma.internalPreparation.update({
      where: { id },
      data,
    });
  }

  async deleteInternalPreparation(id: string, establishmentId: string): Promise<void> {
    const prep = await this.prisma.internalPreparation.findFirst({ where: { id, establishmentId } });
    if (!prep) throw new NotFoundException('Préparation interne non trouvée');
    await this.prisma.internalPreparation.delete({
      where: { id },
    });
  }

  // ============================================
  // PREPARATION BATCHES (Staff functions)
  // ============================================

  /**
   * Calculate DLC (Date Limite de Consommation) based on production date and shelf life
   */
  private calculateDLC(
    productionDateTime: Date,
    shelfLifeDays: number,
    shelfLifeHours: number,
  ): Date {
    const totalHours = shelfLifeDays * 24 + shelfLifeHours;
    const dlc = new Date(productionDateTime);
    dlc.setHours(dlc.getHours() + totalHours);
    return dlc;
  }

  /**
   * Generate a unique batch ID
   */
  private async generateBatchId(establishmentId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Count batches created today for this establishment
    const count = await this.prisma.preparationBatch.count({
      where: {
        establishmentId,
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
        },
      },
    });

    return `BATCH-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }

  async createBatch(data: {
    internalPreparationId: string;
    quantity: number;
    unit?: string;
    productionDateTime: Date;
    establishmentId: string;
    createdByUserId: string;
  }): Promise<PreparationBatch> {
    // Get the internal preparation to calculate DLC
    const preparation = await this.prisma.internalPreparation.findFirst({
      where: { id: data.internalPreparationId, establishmentId: data.establishmentId },
    });

    if (!preparation) {
      throw new NotFoundException('Internal preparation not found');
    }

    // Calculate DLC
    const dlc = this.calculateDLC(
      data.productionDateTime,
      preparation.shelfLifeDays,
      preparation.shelfLifeHours,
    );

    // Generate batch ID
    const batchId = await this.generateBatchId(data.establishmentId);

    return this.prisma.preparationBatch.create({
      data: {
        batchId,
        internalPreparationId: data.internalPreparationId,
        quantity: data.quantity,
        unit: data.unit || 'kg',
        productionDateTime: data.productionDateTime,
        dlc,
        status: BatchStatus.PREPARED,
        establishmentId: data.establishmentId,
        createdByUserId: data.createdByUserId,
      },
      include: {
        internalPreparation: true,
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

  async createRecipe(
    establishmentId: string,
    userId: string,
    dto: CreateRecipeDto,
    photoFile?: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    const shelfLifeDays = dto.shelfLifeDays !== undefined ? parseInt(String(dto.shelfLifeDays), 10) : 0;
    const shelfLifeHours = dto.shelfLifeHours !== undefined ? parseInt(String(dto.shelfLifeHours), 10) : 0;
    const quantity = parseFloat(String(dto.quantity)) || 1;
    const unit = dto.unit || 'pièces';

    // 1. Find or create internal preparation
    let preparation = await this.prisma.internalPreparation.findFirst({
      where: {
        establishmentId,
        name: { equals: dto.name.trim(), mode: 'insensitive' },
      },
    });

    if (!preparation) {
      preparation = await this.prisma.internalPreparation.create({
        data: {
          name: dto.name.trim(),
          category: 'Recette',
          shelfLifeDays,
          shelfLifeHours,
          establishmentId,
          createdByUserId: userId,
        },
      });
    } else {
      // Update shelf life if provided
      if (shelfLifeDays > 0 || shelfLifeHours > 0) {
        preparation = await this.prisma.internalPreparation.update({
          where: { id: preparation.id },
          data: { shelfLifeDays, shelfLifeHours },
        });
      }
    }

    // 2. Upload photo if provided
    let photoUrl: string | null = null;
    if (photoFile) {
      photoUrl = this.localFileService.uploadProductPhoto(
        establishmentId,
        photoFile.originalname || 'recipe_photo.jpg',
        photoFile.buffer,
      );
    }

    // 3. Create batch
    const productionDateTime = new Date();
    const dlc = this.calculateDLC(productionDateTime, shelfLifeDays, shelfLifeHours);
    const batchId = await this.generateBatchId(establishmentId);

    return this.prisma.preparationBatch.create({
      data: {
        batchId,
        internalPreparationId: preparation.id,
        quantity,
        unit,
        productionDateTime,
        dlc,
        status: BatchStatus.PREPARED,
        establishmentId,
        createdByUserId: userId,
        photoUrl,
      },
      include: {
        internalPreparation: true,
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

  async listBatches(
    establishmentId: string,
    filters?: {
      status?: BatchStatus;
      internalPreparationId?: string;
    },
  ): Promise<PreparationBatch[]> {
    const where: Prisma.PreparationBatchWhereInput = {
      establishmentId,
      ...filters,
    };

    return this.prisma.preparationBatch.findMany({
      where,
      include: {
        internalPreparation: true,
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        destroyedBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: { productionDateTime: 'desc' },
    });
  }

  async getBatch(id: string, establishmentId: string): Promise<PreparationBatch | null> {
    return this.prisma.preparationBatch.findFirst({
      where: { id, establishmentId },
      include: {
        internalPreparation: true,
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        destroyedBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });
  }

  async getBatchByBatchId(batchId: string, establishmentId: string): Promise<PreparationBatch | null> {
    return this.prisma.preparationBatch.findFirst({
      where: { batchId, establishmentId },
      include: {
        internalPreparation: true,
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        destroyedBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });
  }

  async destroyBatch(id: string, establishmentId: string, destroyedByUserId: string): Promise<PreparationBatch> {
    const batch = await this.prisma.preparationBatch.findFirst({ where: { id, establishmentId } });
    if (!batch) throw new NotFoundException('Lot non trouvé');
    return this.prisma.preparationBatch.update({
      where: { id },
      data: {
        status: BatchStatus.DESTROYED,
        destroyedAt: new Date(),
        destroyedByUserId,
      },
      include: {
        internalPreparation: true,
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        destroyedBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Update batch statuses based on DLC
   * This should be called periodically (e.g., via cron job)
   */
  async updateBatchStatuses(establishmentId?: string): Promise<void> {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const where: Prisma.PreparationBatchWhereInput = {
      establishmentId,
      status: {
        notIn: [BatchStatus.DESTROYED, BatchStatus.EXPIRED],
      },
    };

    // Mark as EXPIRED if DLC has passed
    await this.prisma.preparationBatch.updateMany({
      where: {
        ...where,
        dlc: {
          lt: now,
        },
      },
      data: {
        status: BatchStatus.EXPIRED,
      },
    });

    // Mark as EXPIRING_SOON if DLC is within 24 hours
    await this.prisma.preparationBatch.updateMany({
      where: {
        ...where,
        dlc: {
          gte: now,
          lt: twentyFourHoursFromNow,
        },
      },
      data: {
        status: BatchStatus.EXPIRING_SOON,
      },
    });

    // Mark as VALID if DLC is more than 24 hours away
    await this.prisma.preparationBatch.updateMany({
      where: {
        ...where,
        dlc: {
          gte: twentyFourHoursFromNow,
        },
      },
      data: {
        status: BatchStatus.VALID,
      },
    });
  }
}
