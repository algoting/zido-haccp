import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PendingTask {
  id: string;
  type: 'TEMPERATURE' | 'CLEANING' | 'OIL';
  status: 'PENDING' | 'OVERDUE';
  title: string;
  subtitle: string;
  link: string;
  equipmentId?: string;
  taskId?: string;
  stationId?: string;
  lastDoneAt?: string | null;
  dueInfo?: string;
}

export interface DoneTask {
  id: string;
  type: 'TEMPERATURE' | 'CLEANING' | 'OIL';
  title: string;
  subtitle: string;
  doneAt: string;
  doneBy?: string;
}

export interface TasksHistoryDay {
  date: string;
  tasks: DoneTask[];
}

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async getPendingTasks(establishmentId: string): Promise<PendingTask[]> {
    const now = new Date();
    const tasks: PendingTask[] = [];

    // ─── 1. Temperature tasks ────────────────────────────
    const equipment = await this.prisma.equipment.findMany({
      where: { establishmentId, status: 'ACTIVE', type: { not: 'Friteuse' } },
      include: {
        temperatureLogs: {
          orderBy: { measuredAt: 'desc' },
          take: 1,
        },
      },
    });

    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const FOUR_HOURS = 4 * 60 * 60 * 1000;

    for (const eq of equipment) {
      const lastLog = eq.temperatureLogs[0];
      const elapsed = lastLog
        ? now.getTime() - new Date(lastLog.measuredAt).getTime()
        : Infinity;

      if (elapsed >= TWO_HOURS) {
        const isOverdue = elapsed >= FOUR_HOURS;
        let dueInfo: string;
        if (!lastLog) {
          dueInfo = 'Aucun relevé aujourd\'hui';
        } else {
          const hours = Math.floor(elapsed / (60 * 60 * 1000));
          const mins = Math.floor((elapsed % (60 * 60 * 1000)) / (60 * 1000));
          dueInfo = `Dernier relevé il y a ${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}`;
        }

        tasks.push({
          id: `temp-${eq.id}`,
          type: 'TEMPERATURE',
          status: isOverdue ? 'OVERDUE' : 'PENDING',
          title: `Relevé de température`,
          subtitle: eq.name,
          link: `/temperature-logs?equipment=${eq.id}`,
          equipmentId: eq.id,
          lastDoneAt: lastLog?.measuredAt?.toISOString() || null,
          dueInfo,
        });
      }
    }

    // ─── 2. Cleaning tasks ───────────────────────────────
    const today = new Date();
    const dateKey = today.toISOString().slice(0, 10);
    const isMonday = today.getDay() === 1;

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

    const plan = await this.prisma.cleaningPlan.findUnique({
      where: { establishmentId_dateKey: { establishmentId, dateKey } },
      include: { taskChecks: true },
    });

    const checkedTaskIds = new Set(
      (plan?.taskChecks || []).map((c) => c.taskId),
    );

    for (const sector of cleaningSectors) {
      for (const eq of sector.equipment) {
        for (const task of eq.tasks) {
          const isDaily = task.frequency === 'DAILY';
          const isWeekly = task.frequency === 'WEEKLY';
          if (!isDaily && !(isWeekly && isMonday)) continue;

          if (!checkedTaskIds.has(task.id)) {
            tasks.push({
              id: `clean-${task.id}`,
              type: 'CLEANING',
              status: 'PENDING',
              title: task.name,
              subtitle: `${sector.name} — ${eq.name}`,
              link: '/cleaning',
              taskId: task.id,
              dueInfo: isWeekly ? 'Hebdomadaire' : 'Quotidien',
            });
          }
        }
      }
    }

    // ─── 3. Oil checks ──────────────────────────────────
    const oilStations = await this.prisma.oilStation.findMany({
      where: { establishmentId, active: true },
      include: {
        checks: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (const station of oilStations) {
      const lastCheck = station.checks[0];
      const hasCheckToday = lastCheck && new Date(lastCheck.createdAt) >= todayStart;

      if (!hasCheckToday) {
        const daysSince = lastCheck
          ? Math.floor((now.getTime() - new Date(lastCheck.createdAt).getTime()) / (24 * 60 * 60 * 1000))
          : null;

        tasks.push({
          id: `oil-${station.id}`,
          type: 'OIL',
          status: daysSince !== null && daysSince >= 2 ? 'OVERDUE' : 'PENDING',
          title: 'Contrôle huile',
          subtitle: station.name,
          link: '/oil',
          stationId: station.id,
          lastDoneAt: lastCheck?.createdAt?.toISOString() || null,
          dueInfo: daysSince !== null
            ? `Dernier contrôle il y a ${daysSince} jour${daysSince > 1 ? 's' : ''}`
            : 'Aucun contrôle effectué',
        });
      }
    }

    // Sort: overdue first, then pending
    tasks.sort((a, b) => {
      if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
      if (a.status !== 'OVERDUE' && b.status === 'OVERDUE') return 1;
      return 0;
    });

    return tasks;
  }

  async getTasksHistory(
    establishmentId: string,
    days: number = 30,
  ): Promise<TasksHistoryDay[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    // ─── 1. Temperature logs ─────────────────────────────
    const tempLogs = await this.prisma.temperatureLog.findMany({
      where: {
        establishmentId,
        measuredAt: { gte: since },
      },
      include: {
        equipment: { select: { name: true } },
        recordedBy: { select: { displayName: true, email: true } },
      },
      orderBy: { measuredAt: 'desc' },
    });

    // ─── 2. Cleaning task checks ─────────────────────────
    const cleaningChecks = await this.prisma.cleaningTaskCheck.findMany({
      where: {
        checkedAt: { gte: since },
        plan: { establishmentId },
      },
      include: {
        task: {
          include: {
            equipment: {
              include: { sector: true },
            },
          },
        },
        checkedBy: { select: { displayName: true, email: true } },
      },
      orderBy: { checkedAt: 'desc' },
    });

    // ─── 3. Oil checks ──────────────────────────────────
    const oilChecks = await this.prisma.oilCheck.findMany({
      where: {
        createdAt: { gte: since },
        station: { establishmentId },
      },
      include: {
        station: { select: { name: true } },
        recordedBy: { select: { displayName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ─── Merge into done tasks ───────────────────────────
    const allDone: DoneTask[] = [];

    for (const log of tempLogs) {
      allDone.push({
        id: `temp-${log.id}`,
        type: 'TEMPERATURE',
        title: `Relevé ${log.temperatureC}°C (${log.conformity === 'OK' ? '✓' : '⚠️'})`,
        subtitle: log.equipment.name,
        doneAt: log.measuredAt.toISOString(),
        doneBy: log.recordedBy?.displayName || log.recordedBy?.email || undefined,
      });
    }

    for (const check of cleaningChecks) {
      allDone.push({
        id: `clean-${check.id}`,
        type: 'CLEANING',
        title: check.task.name,
        subtitle: `${check.task.equipment?.sector?.name || ''} — ${check.task.equipment?.name || ''}`,
        doneAt: check.checkedAt.toISOString(),
        doneBy: check.checkedBy?.displayName || check.checkedBy?.email || undefined,
      });
    }

    for (const check of oilChecks) {
      allDone.push({
        id: `oil-${check.id}`,
        type: 'OIL',
        title: `Contrôle huile — ${check.quality}`,
        subtitle: check.station.name,
        doneAt: check.createdAt.toISOString(),
        doneBy: check.recordedBy?.displayName || check.recordedBy?.email || undefined,
      });
    }

    // ─── Group by day ────────────────────────────────────
    allDone.sort((a, b) => new Date(b.doneAt).getTime() - new Date(a.doneAt).getTime());

    const byDay = new Map<string, DoneTask[]>();
    for (const task of allDone) {
      const dayKey = task.doneAt.slice(0, 10);
      if (!byDay.has(dayKey)) byDay.set(dayKey, []);
      byDay.get(dayKey)!.push(task);
    }

    const result: TasksHistoryDay[] = [];
    for (const [date, tasks] of byDay) {
      result.push({ date, tasks });
    }

    return result;
  }
}
