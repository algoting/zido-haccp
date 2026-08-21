import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSectorDto } from './dto/create-sector.dto';
import { CreateSubSectorDto } from './dto/create-subsector.dto';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { DEFAULT_CLEANING_ZONES } from './cleaning-zones.constants';

@Injectable()
export class CleaningService {
  constructor(private prisma: PrismaService) {}

  // ─── INITIALIZATION ────────────────────────────────

  /**
   * Initialize default cleaning zones for a new establishment
   */
  async initializeDefaultZones(establishmentId: string) {
    for (const zone of DEFAULT_CLEANING_ZONES) {
      const sector = await this.prisma.cleaningSector.create({
        data: { establishmentId, name: zone.name, icon: zone.icon, order: zone.order, isSystemZone: true },
      });
      const subSector = await this.prisma.cleaningSubSector.create({
        data: { sectorId: sector.id, name: 'Général', icon: '🧹', order: 0 },
      });
      const equipment = await this.prisma.cleaningEquipment.create({
        data: { subSectorId: subSector.id, name: 'Nettoyage général', order: 0 },
      });
      await this.prisma.cleaningTask.create({
        data: { equipmentId: equipment.id, name: 'Nettoyage quotidien', frequency: 'DAILY', order: 0 },
      });
    }
  }

  // ─── SECTORS ───────────────────────────────────────

  async listSectors(establishmentId: string) {
    return this.prisma.cleaningSector.findMany({
      where: { establishmentId },
      include: {
        subSectors: {
          include: {
            equipment: {
              include: {
                tasks: { orderBy: { order: 'asc' } },
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async createSector(establishmentId: string, dto: CreateSectorDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const sector = await tx.cleaningSector.create({
          data: {
            establishmentId,
            name: dto.name,
            icon: dto.icon ?? '🏢',
            order: dto.order ?? 0,
          },
        });

        const subSector = await tx.cleaningSubSector.create({
          data: { sectorId: sector.id, name: 'Général', icon: '🧹', order: 0 },
        });

        const equipment = await tx.cleaningEquipment.create({
          data: { subSectorId: subSector.id, name: 'Nettoyage général', order: 0 },
        });

        await tx.cleaningTask.create({
          data: { equipmentId: equipment.id, name: 'Nettoyage quotidien', frequency: 'DAILY', order: 0 },
        });

        return sector;
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Un secteur avec ce nom existe déjà');
      }
      throw e;
    }
  }

  async updateSector(sectorId: string, establishmentId: string, dto: Partial<CreateSectorDto>) {
    const sector = await this.prisma.cleaningSector.findFirstOrThrow({
      where: { id: sectorId, establishmentId },
    });

    if (sector.isSystemZone && dto.name !== undefined && dto.name !== sector.name) {
      throw new ConflictException('Le nom des zones système ne peut pas être modifié');
    }

    return this.prisma.cleaningSector.update({
      where: { id: sectorId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
  }

  async deleteSector(sectorId: string, establishmentId: string) {
    const sector = await this.prisma.cleaningSector.findFirstOrThrow({
      where: { id: sectorId, establishmentId },
    });

    if (sector.isSystemZone) {
      throw new ConflictException('Les zones système ne peuvent pas être supprimées');
    }

    return this.prisma.cleaningSector.delete({ where: { id: sectorId } });
  }

  // ─── SIMPLIFIED TASK MANAGEMENT FOR STAFF ─────────

  /** Find or create the shared "Général" subsector + "Nettoyage" equipment for a sector */
  private async getOrCreateGeneralEquipment(sectorId: string) {
    const sector = await this.prisma.cleaningSector.findFirst({
      where: { id: sectorId },
      include: { subSectors: { include: { equipment: true } } },
    });
    if (!sector) throw new NotFoundException('Secteur non trouvé');

    let subSector = sector.subSectors.find((s) => s.name === 'Général');
    if (!subSector) {
      subSector = await this.prisma.cleaningSubSector.create({
        data: { sectorId, name: 'Général', icon: '🧹', order: 0 },
        include: { equipment: true },
      }) as any;
    }

    let equipment = (subSector as any).equipment?.find((e: any) => e.name === 'Nettoyage');
    if (!equipment) {
      equipment = await this.prisma.cleaningEquipment.create({
        data: { subSectorId: subSector!.id, name: 'Nettoyage', order: 0 },
      });
    }
    return equipment;
  }

  async addTaskToSector(sectorId: string, establishmentId: string, taskName: string) {
    const sector = await this.prisma.cleaningSector.findFirst({ where: { id: sectorId, establishmentId } });
    if (!sector) throw new NotFoundException('Secteur non trouvé');

    const equipment = await this.getOrCreateGeneralEquipment(sectorId);

    try {
      return await this.prisma.cleaningTask.create({
        data: { equipmentId: equipment.id, name: taskName, frequency: 'DAILY', order: 0 },
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('Une tâche avec ce nom existe déjà dans ce secteur');
      throw e;
    }
  }

  async listTasksForSector(sectorId: string, establishmentId: string) {
    const sector = await this.prisma.cleaningSector.findFirst({
      where: { id: sectorId, establishmentId },
      include: {
        subSectors: {
          include: { equipment: { include: { tasks: { orderBy: { order: 'asc' } } } } },
        },
      },
    });
    if (!sector) throw new NotFoundException('Secteur non trouvé');
    return sector.subSectors.flatMap((ss) => ss.equipment.flatMap((eq) => eq.tasks));
  }

  // ─── SIMPLIFIED EQUIPMENT FOR STAFF ───────────────

  async addEquipmentToSector(sectorId: string, establishmentId: string, name: string) {
    const sector = await this.prisma.cleaningSector.findFirst({
      where: { id: sectorId, establishmentId },
      include: { subSectors: true },
    });
    if (!sector) throw new NotFoundException('Secteur non trouvé');

    let subSector = sector.subSectors.find((s) => s.name === 'Général');
    if (!subSector) {
      subSector = await this.prisma.cleaningSubSector.create({
        data: { sectorId, name: 'Général', icon: '🧹', order: 0 },
      });
    }

    const equipment = await this.prisma.cleaningEquipment.create({
      data: { subSectorId: subSector.id, name, order: 0 },
    });
    await this.prisma.cleaningTask.create({
      data: { equipmentId: equipment.id, name: 'Nettoyage quotidien', frequency: 'DAILY', order: 0 },
    });
    return equipment;
  }

  // ─── SUB-SECTORS ──────────────────────────────────

  async createSubSector(establishmentId: string, dto: CreateSubSectorDto) {
    await this.prisma.cleaningSector.findFirstOrThrow({
      where: { id: dto.sectorId, establishmentId },
    });

    try {
      return await this.prisma.cleaningSubSector.create({
        data: {
          sectorId: dto.sectorId,
          name: dto.name,
          icon: dto.icon ?? '📍',
          order: dto.order ?? 0,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Un sous-secteur avec ce nom existe déjà dans ce secteur');
      }
      throw e;
    }
  }

  async deleteSubSector(subSectorId: string, establishmentId: string) {
    await this.prisma.cleaningSubSector.findFirstOrThrow({
      where: { id: subSectorId, sector: { establishmentId } },
    });
    return this.prisma.cleaningSubSector.delete({ where: { id: subSectorId } });
  }

  // ─── EQUIPMENT ─────────────────────────────────────

  async createEquipment(establishmentId: string, dto: CreateEquipmentDto) {
    // Verify the sub-sector belongs to a sector in this establishment
    await this.prisma.cleaningSubSector.findFirstOrThrow({
      where: { id: dto.sectorId, sector: { establishmentId } },
    });

    try {
      return await this.prisma.cleaningEquipment.create({
        data: {
          subSectorId: dto.sectorId,
          name: dto.name,
          order: dto.order ?? 0,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Un équipement avec ce nom existe déjà dans ce sous-secteur');
      }
      throw e;
    }
  }

  async updateEquipment(equipmentId: string, establishmentId: string, dto: Partial<CreateEquipmentDto>) {
    // Verify the equipment belongs to a sub-sector in this establishment
    const equipment = await this.prisma.cleaningEquipment.findFirstOrThrow({
      where: { id: equipmentId, subSector: { sector: { establishmentId } } },
    });
    return this.prisma.cleaningEquipment.update({
      where: { id: equipment.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
  }

  async deleteEquipment(equipmentId: string, establishmentId: string) {
    await this.prisma.cleaningEquipment.findFirstOrThrow({
      where: { id: equipmentId, subSector: { sector: { establishmentId } } },
    });
    return this.prisma.cleaningEquipment.delete({ where: { id: equipmentId } });
  }

  // ─── TASKS ─────────────────────────────────────────

  async createTask(establishmentId: string, dto: CreateTaskDto) {
    // Verify the equipment belongs to a sub-sector in this establishment
    await this.prisma.cleaningEquipment.findFirstOrThrow({
      where: { id: dto.equipmentId, subSector: { sector: { establishmentId } } },
    });

    try {
      return await this.prisma.cleaningTask.create({
        data: {
          equipmentId: dto.equipmentId,
          name: dto.name,
          frequency: dto.frequency ?? 'DAILY',
          order: dto.order ?? 0,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Une tâche avec ce nom existe déjà pour cet équipement');
      }
      throw e;
    }
  }

  async updateTask(taskId: string, establishmentId: string, dto: Partial<CreateTaskDto>) {
    await this.prisma.cleaningTask.findFirstOrThrow({
      where: { id: taskId, equipment: { subSector: { sector: { establishmentId } } } },
    });
    return this.prisma.cleaningTask.update({
      where: { id: taskId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
  }

  async deleteTask(taskId: string, establishmentId: string) {
    await this.prisma.cleaningTask.findFirstOrThrow({
      where: { id: taskId, equipment: { subSector: { sector: { establishmentId } } } },
    });
    return this.prisma.cleaningTask.delete({ where: { id: taskId } });
  }

  // ─── DAILY PLAN & CHECKS ──────────────────────────

  async getTodayPlan(establishmentId: string) {
    const dateKey = this.getDateKey(new Date());
    const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon...

    // Get or create today's plan
    let plan = await this.prisma.cleaningPlan.findUnique({
      where: { establishmentId_dateKey: { establishmentId, dateKey } },
      include: {
        taskChecks: {
          include: {
            checkedBy: { select: { id: true, email: true, displayName: true } },
            task: true,
          },
        },
      },
    });

    if (!plan) {
      plan = await this.prisma.cleaningPlan.create({
        data: { establishmentId, dateKey },
        include: {
          taskChecks: {
            include: {
              checkedBy: { select: { id: true, email: true, displayName: true } },
              task: true,
            },
          },
        },
      });
    }

    // Get all tasks for this establishment, filtered by frequency
    const sectors = await this.prisma.cleaningSector.findMany({
      where: { establishmentId },
      include: {
        subSectors: {
          include: {
            equipment: {
              include: {
                tasks: {
                  where: {
                    OR: [
                      { frequency: 'DAILY' },
                      // Weekly tasks only on Monday (day 1)
                      ...(dayOfWeek === 1 ? [{ frequency: 'WEEKLY' as const }] : []),
                    ],
                  },
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Build a set of checked task IDs
    const checkedTaskIds = new Set(plan.taskChecks.map((tc) => tc.taskId));
    const checksMap = new Map(plan.taskChecks.map((tc) => [tc.taskId, tc]));

    return {
      plan: {
        id: plan.id,
        dateKey: plan.dateKey,
        completedAt: plan.completedAt,
      },
      sectors: sectors.map((sector) => ({
        ...sector,
        subSectors: sector.subSectors.map((subSector) => ({
          ...subSector,
          equipment: subSector.equipment
            .map((eq) => ({
              ...eq,
              tasks: eq.tasks.map((task) => ({
                ...task,
                checked: checkedTaskIds.has(task.id),
                check: checksMap.get(task.id) || null,
              })),
            }))
            .filter((eq) => eq.tasks.length > 0),
        })).filter((ss) => ss.equipment.length > 0),
      })).filter((s) => s.subSectors.length > 0),
    };
  }

  async checkTask(planId: string, taskId: string, userId: string, establishmentId: string) {
    const plan = await this.prisma.cleaningPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException('Plan de nettoyage non trouvé');
    if (plan.establishmentId !== establishmentId) throw new NotFoundException('Plan de nettoyage non trouvé');
    if (plan.completedAt) throw new ConflictException('Plan déjà complété');

    try {
      return await this.prisma.cleaningTaskCheck.create({
        data: { planId, taskId, checkedByUserId: userId },
        include: {
          checkedBy: { select: { id: true, email: true, displayName: true } },
          task: true,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Tâche déjà cochée');
      }
      throw e;
    }
  }

  async uncheckTask(planId: string, taskId: string, establishmentId: string) {
    const plan = await this.prisma.cleaningPlan.findUnique({ where: { id: planId } });
    if (!plan || plan.establishmentId !== establishmentId) throw new NotFoundException('Plan de nettoyage non trouvé');
    if (plan.completedAt) throw new ConflictException('Plan déjà complété');

    const check = await this.prisma.cleaningTaskCheck.findUnique({
      where: { planId_taskId: { planId, taskId } },
    });
    if (!check) throw new NotFoundException('Check non trouvé');

    return this.prisma.cleaningTaskCheck.delete({
      where: { id: check.id },
    });
  }

  async completePlan(planId: string, establishmentId: string) {
    const plan = await this.prisma.cleaningPlan.findUnique({ where: { id: planId } });
    if (!plan || plan.establishmentId !== establishmentId) throw new NotFoundException('Plan de nettoyage non trouvé');
    return this.prisma.cleaningPlan.update({
      where: { id: planId },
      data: { completedAt: new Date() },
    });
  }

  async getHistory(establishmentId: string, take = 30) {
    return this.prisma.cleaningPlan.findMany({
      where: { establishmentId },
      include: {
        taskChecks: {
          include: {
            task: true,
            checkedBy: { select: { email: true, displayName: true } },
          },
        },
      },
      orderBy: { dateKey: 'desc' },
      take,
    });
  }

  // ─── HELPERS ───────────────────────────────────────

  private getDateKey(date: Date): string {
    return date.toISOString().slice(0, 10); // YYYY-MM-DD
  }
}
