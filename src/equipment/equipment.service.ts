import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateEquipmentSectorDto } from './dto/create-equipment-sector.dto';
import type { User } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class EquipmentService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(user: User, dto: CreateEquipmentDto) {
    if (!user.establishmentId) {
      throw new ForbiddenException(
        "L'utilisateur n'est pas lié à un établissement",
      );
    }

    if (dto.minTempC > dto.maxTempC) {
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

    // Auto-create cleaning equipment + default cleaning task
    if (dto.sectorId) {
      const sector = await this.prisma.equipmentSector.findUnique({
        where: { id: dto.sectorId },
      });
      if (sector) {
        const cleaningSector = await this.prisma.cleaningSector.findUnique({
          where: {
            establishmentId_name: {
              establishmentId: user.establishmentId,
              name: sector.name,
            },
          },
        });
        if (cleaningSector) {
          const existingCE = await this.prisma.cleaningEquipment.findUnique({
            where: {
              sectorId_name: {
                sectorId: cleaningSector.id,
                name: created.name,
              },
            },
          });
          if (!existingCE) {
            const cleaningEquipment =
              await this.prisma.cleaningEquipment.create({
                data: {
                  sectorId: cleaningSector.id,
                  name: created.name,
                },
              });
            await this.prisma.cleaningTask.create({
              data: {
                equipmentId: cleaningEquipment.id,
                name: 'Nettoyage',
                frequency: 'DAILY',
              },
            });
          }
        }
      }
    }

    // Auto-create OilStation if equipment is a Friteuse
    if (
      dto.type &&
      (dto.type.toLowerCase().includes('frit') ||
        dto.type.toLowerCase().includes('fryer'))
    ) {
      const existingStation = await this.prisma.oilStation.findFirst({
        where: {
          establishmentId: user.establishmentId,
          name: { equals: created.name, mode: 'insensitive' },
        },
      });
      if (!existingStation) {
        await this.prisma.oilStation.create({
          data: {
            establishmentId: user.establishmentId,
            name: created.name,
            active: true,
          },
        });
      } else if (!existingStation.active) {
        await this.prisma.oilStation.update({
          where: { id: existingStation.id },
          data: { active: true },
        });
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

    const minTempC = dto.minTempC ?? equipment.minTempC;
    const maxTempC = dto.maxTempC ?? equipment.maxTempC;

    if (minTempC > maxTempC) {
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

    // Auto-deactivate OilStation if it was a Friteuse
    if (
      equipment.type &&
      (equipment.type.toLowerCase().includes('frit') ||
        equipment.type.toLowerCase().includes('fryer'))
    ) {
      await this.prisma.oilStation.updateMany({
        where: {
          establishmentId: equipment.establishmentId,
          name: { equals: equipment.name, mode: 'insensitive' },
        },
        data: { active: false },
      });
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

    // Auto-deactivate OilStation if it was a Friteuse
    if (
      equipment.type &&
      (equipment.type.toLowerCase().includes('frit') ||
        equipment.type.toLowerCase().includes('fryer'))
    ) {
      await this.prisma.oilStation.updateMany({
        where: {
          establishmentId: equipment.establishmentId,
          name: { equals: equipment.name, mode: 'insensitive' },
        },
        data: { active: false },
      });
    }

    return { success: true };
  }

  // ─── HELPERS ─────────────────────────────────────────

  // ─── HELPERS ─────────────────────────────────────────────────────

  async getTodayStatus(establishmentId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateKey = today.toISOString().slice(0, 10);

    // Get all active equipment (exclude friteuses — oil only)
    const equipment = await this.prisma.equipment.findMany({
      where: { establishmentId, status: 'ACTIVE', type: { not: 'Friteuse' } },
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
        equipment: {
          include: {
            tasks: true,
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
      for (const ce of sector.equipment) {
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

  private async removeFromCleaningSector(establishmentId: string, sectorName: string, equipmentName: string) {
    const cleaningSector = await this.prisma.cleaningSector.findUnique({
      where: { establishmentId_name: { establishmentId, name: sectorName } },
    });
    if (cleaningSector) {
      const cleaningEquipment = await this.prisma.cleaningEquipment.findUnique({
        where: { sectorId_name: { sectorId: cleaningSector.id, name: equipmentName } },
      });
      if (cleaningEquipment) {
        await this.prisma.cleaningEquipment.delete({ where: { id: cleaningEquipment.id } });
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

    // When assigning to a sector, auto-add equipment to matching cleaning sector
    if (sectorId && updated.sector) {
      const cleaningSector = await this.prisma.cleaningSector.findUnique({
        where: {
          establishmentId_name: {
            establishmentId: updated.establishmentId,
            name: updated.sector.name,
          },
        },
      });
      if (cleaningSector) {
        const existing = await this.prisma.cleaningEquipment.findUnique({
          where: { sectorId_name: { sectorId: cleaningSector.id, name: updated.name } },
        });
        if (!existing) {
          const cleaningEquipment = await this.prisma.cleaningEquipment.create({
            data: {
              sectorId: cleaningSector.id,
              name: updated.name,
            },
          });
          await this.prisma.cleaningTask.create({
            data: {
              equipmentId: cleaningEquipment.id,
              name: 'Nettoyage',
              frequency: 'DAILY',
            },
          });
        }
      }
    }

    return updated;
  }
}
