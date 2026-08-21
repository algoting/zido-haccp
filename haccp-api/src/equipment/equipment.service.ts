import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateEquipmentSectorDto } from './dto/create-equipment-sector.dto';
import { ConnectSopalogDto } from './dto/connect-sopalog.dto';
import type { User } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { SopalogService } from '../integrations/sopalogs/sopalogs.service';

@Injectable()
export class EquipmentService {
  private readonly logger = new Logger(EquipmentService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private sopalogs: SopalogService,
  ) {}

  async create(user: User, dto: CreateEquipmentDto) {
    if (!user.establishmentId) {
      throw new ForbiddenException(
        "L'utilisateur n'est pas lié à un établissement",
      );
    }

    if (
      dto.minTempC != null &&
      dto.maxTempC != null &&
      dto.minTempC > dto.maxTempC
    ) {
      throw new BadRequestException(
        'minTempC ne peut pas être supérieur à maxTempC',
      );
    }

    const created = await this.prisma.equipment.create({
      data: {
        ...dto,
        establishmentId: user.establishmentId,
        createdByUserId: user.id,
      },
    });

    if (dto.sectorId) {
      const sector = await this.prisma.equipmentSector.findUnique({
        where: { id: dto.sectorId },
      });
      if (sector) {
        await this.ensureCleaningEquipmentForSector(
          user.establishmentId,
          sector.name,
          created.name,
        );
      }
    }

    await this.audit.log({
      establishmentId: user.establishmentId,
      user,
      action: 'EQUIPMENT_CREATED',
      entityType: 'Equipment',
      entityId: created.id,
      afterJson: created,
    });

    return created;
  }

  async findAll(user: User) {
    if (!user.establishmentId) {
      return [];
    }

    return this.prisma.equipment.findMany({
      where: {
        establishmentId: user.establishmentId,
        status: 'ACTIVE',
      },
      include: { sector: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(user: User, equipmentId: string, dto: UpdateEquipmentDto) {
    if (!user.establishmentId) {
      throw new ForbiddenException("L'utilisateur n'est pas lié à un établissement");
    }

    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        establishmentId: user.establishmentId,
      },
    });

    if (!equipment) {
      throw new NotFoundException('Équipement non trouvé');
    }

    const minTempC = dto.minTempC !== undefined ? dto.minTempC : equipment.minTempC;
    const maxTempC = dto.maxTempC !== undefined ? dto.maxTempC : equipment.maxTempC;

    if (minTempC != null && maxTempC != null && minTempC > maxTempC) {
      throw new BadRequestException(
        'minTempC ne peut pas être supérieur à maxTempC',
      );
    }

    const updated = await this.prisma.equipment.update({
      where: { id: equipmentId },
      data: dto,
    });

    await this.audit.log({
      establishmentId: user.establishmentId ?? equipment.establishmentId,
      user,
      action: 'EQUIPMENT_UPDATED',
      entityType: 'Equipment',
      entityId: updated.id,
      beforeJson: equipment,
      afterJson: updated,
    });

    return updated;
  }

  async deactivate(user: User, equipmentId: string) {
    if (!user.establishmentId) {
      throw new ForbiddenException("L'utilisateur n'est pas lié à un établissement");
    }

    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        establishmentId: user.establishmentId,
      },
    });

    if (!equipment) {
      throw new NotFoundException('Équipement non trouvé');
    }

    const updated = await this.prisma.equipment.update({
      where: { id: equipmentId },
      data: { status: 'INACTIVE' },
    });

    await this.audit.log({
      establishmentId: user.establishmentId ?? equipment.establishmentId,
      user,
      action: 'EQUIPMENT_DEACTIVATED',
      entityType: 'Equipment',
      entityId: updated.id,
      beforeJson: equipment,
      afterJson: updated,
    });

    // Auto-remove from cleaning sector when deactivated
    if (equipment.sectorId) {
      const sector = await this.prisma.equipmentSector.findUnique({
        where: { id: equipment.sectorId },
      });
      if (sector) {
        await this.removeFromCleaningSector(equipment.establishmentId, sector.name, equipment.name);
      }
    }

    return updated;
  }

  async delete(user: User, equipmentId: string) {
    if (!user.establishmentId) {
      throw new ForbiddenException("L'utilisateur n'est pas lié à un établissement");
    }

    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        establishmentId: user.establishmentId,
      },
    });

    if (!equipment) {
      throw new NotFoundException('Équipement non trouvé');
    }

    const deleted = await this.prisma.equipment.delete({
      where: { id: equipmentId },
    });

    await this.audit.log({
      establishmentId: user.establishmentId ?? equipment.establishmentId,
      user,
      action: 'EQUIPMENT_DEACTIVATED',
      entityType: 'Equipment',
      entityId: deleted.id,
      beforeJson: equipment,
    });

    // Auto-remove from cleaning sector
    if (equipment.sectorId) {
      const sector = await this.prisma.equipmentSector.findUnique({
        where: { id: equipment.sectorId },
      });
      if (sector) {
        await this.removeFromCleaningSector(equipment.establishmentId, sector.name, equipment.name);
      }
    }

    return { success: true };
  }

  // ─── HELPERS ─────────────────────────────────────────

  async getTodayStatus(establishmentId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateKey = today.toISOString().slice(0, 10);

    // Get all active equipment (exclude friteuse/four — oil-only or cleaning-only)
    const equipment = await this.prisma.equipment.findMany({
      where: { establishmentId, status: 'ACTIVE', type: { notIn: ['Friteuse', 'Four'] } },
      include: { sector: true },
    });

    // Get today's temperature logs
    const todayLogs = await this.prisma.temperatureLog.findMany({
      where: {
        establishmentId,
        measuredAt: { gte: today, lt: tomorrow },
      },
      select: { equipmentId: true },
    });
    const loggedEquipmentIds = new Set(todayLogs.map((l) => l.equipmentId));

    // Get today's cleaning plan with checks
    const plan = await this.prisma.cleaningPlan.findUnique({
      where: { establishmentId_dateKey: { establishmentId, dateKey } },
      include: {
        taskChecks: { select: { taskId: true } },
      },
    });
    const checkedTaskIds = new Set(
      (plan?.taskChecks || []).map((c) => c.taskId),
    );

    // Get cleaning equipment mapped by name for this establishment
    const cleaningSectors = await this.prisma.cleaningSector.findMany({
      where: { establishmentId },
      include: {
        subSectors: {
          include: {
            equipment: {
              include: {
                tasks: true,
              },
            },
          },
        },
      },
    });

    // Build a map: equipment name -> { totalTasks, checkedTasks }
    const cleaningByName = new Map<
      string,
      { totalTasks: number; checkedTasks: number }
    >();
    for (const sector of cleaningSectors) {
      for (const subSector of sector.subSectors) {
      for (const ce of subSector.equipment) {
        let total = 0;
        let checked = 0;
        for (const task of ce.tasks) {
          // Filter by frequency like the cleaning service does
          const isDaily = task.frequency === 'DAILY';
          const isMonday = today.getDay() === 1;
          if (isDaily || (task.frequency === 'WEEKLY' && isMonday)) {
            total++;
            if (checkedTaskIds.has(task.id)) {
              checked++;
            }
          }
        }
        cleaningByName.set(ce.name, { totalTasks: total, checkedTasks: checked });
      }
      }
    }

    return equipment.map((eq) => {
      const cleaning = cleaningByName.get(eq.name);
      return {
        equipmentId: eq.id,
        hasTemperatureToday: loggedEquipmentIds.has(eq.id),
        cleaningTotal: cleaning?.totalTasks ?? 0,
        cleaningDone: cleaning?.checkedTasks ?? 0,
      };
    });
  }

  private async ensureCleaningEquipmentForSector(
    establishmentId: string,
    sectorName: string,
    equipmentName: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const cleaningSector = await tx.cleaningSector.upsert({
        where: { establishmentId_name: { establishmentId, name: sectorName } },
        create: { establishmentId, name: sectorName },
        update: {},
      });
      // Upsert a default sub-sector "Général" under the sector
      const cleaningSubSector = await tx.cleaningSubSector.upsert({
        where: { sectorId_name: { sectorId: cleaningSector.id, name: 'Général' } },
        create: { sectorId: cleaningSector.id, name: 'Général' },
        update: {},
      });
      const cleaningEquipment = await tx.cleaningEquipment.upsert({
        where: { subSectorId_name: { subSectorId: cleaningSubSector.id, name: equipmentName } },
        create: { subSectorId: cleaningSubSector.id, name: equipmentName },
        update: {},
      });
      await tx.cleaningTask.upsert({
        where: { equipmentId_name: { equipmentId: cleaningEquipment.id, name: 'Nettoyage' } },
        create: { equipmentId: cleaningEquipment.id, name: 'Nettoyage', frequency: 'DAILY' },
        update: {},
      });
    });
  }

  private async removeFromCleaningSector(establishmentId: string, sectorName: string, equipmentName: string) {
    const cleaningSector = await this.prisma.cleaningSector.findUnique({
      where: { establishmentId_name: { establishmentId, name: sectorName } },
    });
    if (cleaningSector) {
      const cleaningSubSector = await this.prisma.cleaningSubSector.findUnique({
        where: { sectorId_name: { sectorId: cleaningSector.id, name: 'Général' } },
      });
      if (cleaningSubSector) {
        const cleaningEquipment = await this.prisma.cleaningEquipment.findUnique({
          where: { subSectorId_name: { subSectorId: cleaningSubSector.id, name: equipmentName } },
        });
        if (cleaningEquipment) {
          await this.prisma.cleaningEquipment.delete({ where: { id: cleaningEquipment.id } });
        }
      }
    }
  }

  // ─── SECTORS ─────────────────────────────────────────

  async listSectors(establishmentId: string) {
    return this.prisma.equipmentSector.findMany({
      where: { establishmentId },
      include: {
        equipment: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async createSector(establishmentId: string, dto: CreateEquipmentSectorDto) {
    const sector = await this.prisma.equipmentSector.create({
      data: {
        establishmentId,
        name: dto.name,
        order: dto.order ?? 0,
      },
    });

    // Auto-create matching cleaning sector if it doesn't exist
    const existingCleaningSector = await this.prisma.cleaningSector.findUnique({
      where: { establishmentId_name: { establishmentId, name: dto.name } },
    });
    if (!existingCleaningSector) {
      await this.prisma.cleaningSector.create({
        data: {
          establishmentId,
          name: dto.name,
          order: dto.order ?? 0,
        },
      });
    }

    return sector;
  }

  async updateSector(id: string, establishmentId: string, dto: Partial<CreateEquipmentSectorDto>) {
    const sector = await this.prisma.equipmentSector.findFirst({ where: { id, establishmentId } });
    if (!sector) throw new NotFoundException('Secteur non trouvé');
    return this.prisma.equipmentSector.update({
      where: { id },
      data: dto,
    });
  }

  async deleteSector(id: string, establishmentId: string) {
    // Get sector details before deleting
    const sector = await this.prisma.equipmentSector.findFirst({ where: { id, establishmentId } });
    if (!sector) throw new NotFoundException('Secteur non trouvé');

    // Unlink equipment from this sector before deleting
    await this.prisma.equipment.updateMany({
      where: { sectorId: id },
      data: { sectorId: null },
    });
    const deleted = await this.prisma.equipmentSector.delete({ where: { id } });

    // Auto-delete matching cleaning sector (cascades to cleaning equipment & tasks)
    if (sector) {
      const cleaningSector = await this.prisma.cleaningSector.findUnique({
        where: {
          establishmentId_name: {
            establishmentId: sector.establishmentId,
            name: sector.name,
          },
        },
      });
      if (cleaningSector) {
        await this.prisma.cleaningSector.delete({ where: { id: cleaningSector.id } });
      }
    }

    return deleted;
  }

  async assignEquipmentToSector(equipmentId: string, establishmentId: string, sectorId: string | null) {
    // Get old state before updating
    const oldEquipment = await this.prisma.equipment.findFirst({
      where: { id: equipmentId, establishmentId },
    });
    if (!oldEquipment) throw new NotFoundException('Équipement non trouvé');

    const updated = await this.prisma.equipment.update({
      where: { id: equipmentId },
      data: { sectorId },
      include: { sector: true },
    });

    if (sectorId && updated.sector) {
      await this.ensureCleaningEquipmentForSector(
        updated.establishmentId,
        updated.sector.name,
        updated.name,
      );
    }

    // When unassigning from a sector, remove from matching cleaning sector
    if (!sectorId && oldEquipment?.sectorId) {
      const oldSector = await this.prisma.equipmentSector.findUnique({
        where: { id: oldEquipment.sectorId },
      });
      if (oldSector) {
        await this.removeFromCleaningSector(updated.establishmentId, oldSector.name, updated.name);
      }
    }

    return updated;
  }

  // ─── SOPALOGS INTEGRATION ────────────────────────────────────

  /**
   * Connect equipment to a sopalogs device
   * @param user - Current user
   * @param equipmentId - Equipment ID to connect
   * @param dto - Sopalogs device ID
   * @returns Updated equipment with sopalogs fields
   */
  async connectSopalog(user: User, equipmentId: string, dto: ConnectSopalogDto) {
    if (!user.establishmentId) {
      throw new ForbiddenException("L'utilisateur n'est pas lié à un établissement");
    }

    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        establishmentId: user.establishmentId,
      },
    });

    if (!equipment) {
      throw new NotFoundException('Équipement non trouvé');
    }

    // Check if sopalogs is connected (validates that RabbitMQ connection is working)
    if (!this.sopalogs.isConnected()) {
      throw new BadRequestException(
        'Sopalogs RabbitMQ est actuellement indisponible. Veuillez réessayer plus tard.',
      );
    }

    // Update equipment with sopalogs device ID
    const updated = await this.prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        sopalogDeviceId: dto.sopalogDeviceId,
        // No API key needed - RabbitMQ credentials are configured globally
      },
    });

    // Log audit event
    await this.audit.log({
      establishmentId: user.establishmentId,
      user,
      action: 'SOPALOG_CONNECTED',
      entityType: 'Equipment',
      entityId: updated.id,
      afterJson: {
        sopalogDeviceId: dto.sopalogDeviceId,
      },
    });

    this.logger.log(
      `✓ Equipment "${updated.name}" connected to sopalogs device ${dto.sopalogDeviceId}`,
    );

    return {
      id: updated.id,
      name: updated.name,
      sopalogDeviceId: updated.sopalogDeviceId,
      status: 'connected',
    };
  }

  /**
   * Disconnect equipment from sopalogs
   * @param user - Current user
   * @param equipmentId - Equipment ID to disconnect
   * @returns Updated equipment with cleared sopalogs fields
   */
  async disconnectSopalog(user: User, equipmentId: string) {
    if (!user.establishmentId) {
      throw new ForbiddenException("L'utilisateur n'est pas lié à un établissement");
    }

    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        establishmentId: user.establishmentId,
      },
    });

    if (!equipment) {
      throw new NotFoundException('Équipement non trouvé');
    }

    const updated = await this.prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        sopalogDeviceId: null,
      },
    });

    // Log audit event
    await this.audit.log({
      establishmentId: user.establishmentId,
      user,
      action: 'SOPALOG_DISCONNECTED',
      entityType: 'Equipment',
      entityId: updated.id,
      beforeJson: { sopalogDeviceId: equipment.sopalogDeviceId },
    });

    this.logger.log(
      `✓ Equipment "${updated.name}" disconnected from sopalogs`,
    );

    return {
      id: updated.id,
      name: updated.name,
      sopalogDeviceId: null,
      status: 'disconnected',
    };
  }

  /**
   * Get sopalogs connection status for an equipment
   * @param user - Current user
   * @param equipmentId - Equipment ID
   * @returns Connection status
   */
  async getSopalogStatus(user: User, equipmentId: string) {
    if (!user.establishmentId) {
      throw new ForbiddenException("L'utilisateur n'est pas lié à un établissement");
    }

    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        establishmentId: user.establishmentId,
      },
    });

    if (!equipment) {
      throw new NotFoundException('Équipement non trouvé');
    }

    return {
      equipmentId: equipment.id,
      name: equipment.name,
      hasDataLogger: !!equipment.sopalogDeviceId,
      sopalogDeviceId: equipment.sopalogDeviceId,
      rabbitMQConnected: this.sopalogs.isConnected(),
    };
  }
}

