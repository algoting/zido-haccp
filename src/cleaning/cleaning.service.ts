import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSectorDto } from './dto/create-sector.dto';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class CleaningService {
  constructor(private prisma: PrismaService) {}

  // ─── SECTORS ───────────────────────────────────────

  async listSectors(establishmentId: string) {
    const sectors = await this.prisma.cleaningSector.findMany({
      where: { establishmentId },
      include: {
        equipment: {
          include: {
            tasks: { orderBy: { order: 'asc' } },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return sectors.map((sector) => ({
      ...sector,
      subSectors: sector.equipment.map((eq) => ({
        id: eq.id,
        name: eq.name,
        order: eq.order,
        equipment: [
          {
            id: eq.id,
            name: eq.name,
            tasks: eq.tasks || [],
          },
        ],
      })),
    }));
  }

  async createSector(establishmentId: string, dto: CreateSectorDto) {
    try {
      return await this.prisma.cleaningSector.create({
        data: {
          establishmentId,
          name: dto.name,
          order: dto.order ?? 0,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Un secteur avec ce nom existe déjà');
      }
      throw e;
    }
  }

  async updateSector(sectorId: string, establishmentId: string, dto: Partial<CreateSectorDto>) {
    await this.prisma.cleaningSector.findFirstOrThrow({
      where: { id: sectorId, establishmentId },
    });
    return this.prisma.cleaningSector.update({
      where: { id: sectorId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
  }

  async deleteSector(sectorId: string, establishmentId: string) {
    await this.prisma.cleaningSector.findFirstOrThrow({
      where: { id: sectorId, establishmentId },
    });
    return this.prisma.cleaningSector.delete({ where: { id: sectorId } });
  }

  // ─── EQUIPMENT ─────────────────────────────────────

  async createEquipment(establishmentId: string, dto: CreateEquipmentDto) {
    const targetSectorId = dto.sectorId || dto.subSectorId;
    if (!targetSectorId) {
      throw new ConflictException('Secteur manquant');
    }

    // Verify if targetSectorId is a sector
    let sector = await this.prisma.cleaningSector.findFirst({
      where: { id: targetSectorId, establishmentId },
    });

    // If targetSectorId was an equipmentId, find its sector
    if (!sector) {
      const parentEquipment = await this.prisma.cleaningEquipment.findFirst({
        where: { id: targetSectorId, sector: { establishmentId } },
      });
      if (parentEquipment) {
        sector = await this.prisma.cleaningSector.findFirst({
          where: { id: parentEquipment.sectorId, establishmentId },
        });
      }
    }

    if (!sector) {
      sector = await this.prisma.cleaningSector.findFirst({
        where: { establishmentId },
      });
    }

    if (!sector) {
      throw new NotFoundException('Secteur de nettoyage non trouvé');
    }

    try {
      return await this.prisma.cleaningEquipment.create({
        data: {
          sectorId: sector.id,
          name: dto.name,
          order: dto.order ?? 0,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Un équipement avec ce nom existe déjà dans ce secteur');
      }
      throw e;
    }
  }

  async updateEquipment(equipmentId: string, establishmentId: string, dto: Partial<CreateEquipmentDto>) {
    // Verify the equipment belongs to a sector in this establishment
    const equipment = await this.prisma.cleaningEquipment.findFirstOrThrow({
      where: { id: equipmentId, sector: { establishmentId } },
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
      where: { id: equipmentId, sector: { establishmentId } },
    });
    return this.prisma.cleaningEquipment.delete({ where: { id: equipmentId } });
  }

  // ─── TASKS ─────────────────────────────────────────

  async createTask(establishmentId: string, dto: CreateTaskDto) {
    // Verify the equipment belongs to a sector in this establishment
    await this.prisma.cleaningEquipment.findFirstOrThrow({
      where: { id: dto.equipmentId, sector: { establishmentId } },
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
      where: { id: taskId, equipment: { sector: { establishmentId } } },
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
      where: { id: taskId, equipment: { sector: { establishmentId } } },
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
      sectors: sectors.map((sector) => {
        const mappedEquipment = sector.equipment
          .map((eq) => ({
            ...eq,
            tasks: eq.tasks.map((task) => ({
              ...task,
              checked: checkedTaskIds.has(task.id),
              check: checksMap.get(task.id) || null,
            })),
          }))
          .filter((eq) => eq.tasks.length > 0);

        return {
          ...sector,
          equipment: mappedEquipment,
          subSectors: mappedEquipment.map((eq) => ({
            id: eq.id,
            name: eq.name,
            order: eq.order,
            equipment: [
              {
                id: eq.id,
                name: eq.name,
                tasks: eq.tasks || [],
              },
            ],
          })),
        };
      }).filter((s) => s.equipment.length > 0),
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
