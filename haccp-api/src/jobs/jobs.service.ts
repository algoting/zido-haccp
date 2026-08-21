import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../notifications/push-notifications.service';
import { NotificationEventType, NotificationStatus } from '@prisma/client';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  // Deduplication window: avoid sending the same notification within 1 hour
  private readonly DEDUP_WINDOW_MS = 60 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private push: PushNotificationsService,
  ) {}

  /**
   * TEMP_LOG_DUE job (manual trigger only via POST /jobs/temp-log-due)
   * Find all establishments with ACTIVE subscription
   * For each, find ACTIVE equipment where last log > 2h ago
   * Send TEMP_LOG_DUE push to all staff/owner with deduplication
   */
  async tempLogDueJob() {
    const now = new Date();
    const establishments = await this.prisma.establishment.findMany({
      where: {
        subscription: { status: 'ACTIVE' },
        active: true,
      },
      select: { id: true, name: true },
    });

    for (const est of establishments) {
      // Check deduplication: has TEMP_LOG_DUE been sent in last hour?
      const recentEvent = await this.prisma.notificationEvent.findFirst({
        where: {
          establishmentId: est.id,
          type: NotificationEventType.TEMP_LOG_DUE,
          createdAt: {
            gte: new Date(now.getTime() - this.DEDUP_WINDOW_MS),
          },
          status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
        },
      });

      if (recentEvent) {
        this.logger.log(
          `TEMP_LOG_DUE already sent for ${est.name}, skipping dedup`,
        );
        continue;
      }

      // Find ACTIVE equipment
      const equipment = await this.prisma.equipment.findMany({
        where: { establishmentId: est.id, status: 'ACTIVE' },
        select: { id: true, name: true },
      });

      // For each equipment, check last log
      const overdue: string[] = [];
      for (const eq of equipment) {
        const lastLog = await this.prisma.temperatureLog.findFirst({
          where: { equipmentId: eq.id },
          orderBy: { measuredAt: 'desc' },
        });
        if (
          !lastLog ||
          now.getTime() - lastLog.measuredAt.getTime() > 2 * 60 * 60 * 1000
        ) {
          overdue.push(eq.name);
        }
      }

      if (overdue.length > 0) {
        this.logger.log(`TEMP_LOG_DUE for ${est.name}: ${overdue.join(', ')}`);

        // Send push notification
        try {
          await this.push.sendTempLogDueAlert(est.id);
          // Log PUSH event as SENT
          await this.prisma.notificationEvent.create({
            data: {
              establishmentId: est.id,
              userId: null,
              type: NotificationEventType.TEMP_LOG_DUE,
              channel: 'PUSH',
              status: NotificationStatus.SENT,
              titleKey: 'temp_log_due_title',
              bodyKey: 'temp_log_due_body',
              payloadJson: { overdue },
            },
          });
          // Also create IN_APP notification so it shows in the app
          await this.prisma.notificationEvent.create({
            data: {
              establishmentId: est.id,
              userId: null,
              type: NotificationEventType.TEMP_LOG_DUE,
              channel: 'IN_APP',
              status: NotificationStatus.PENDING,
              titleKey: 'Relevé de température à faire',
              bodyKey: `Équipements en attente: ${overdue.join(', ')}`,
              payloadJson: { equipmentNames: overdue },
            },
          });
        } catch (error) {
          this.logger.error(
            `Failed to send TEMP_LOG_DUE for ${est.id}:`,
            error,
          );
          // Log event as FAILED
          await this.prisma.notificationEvent.create({
            data: {
              establishmentId: est.id,
              userId: null,
              type: NotificationEventType.TEMP_LOG_DUE,
              channel: 'PUSH',
              status: NotificationStatus.FAILED,
              titleKey: 'temp_log_due_title',
              bodyKey: 'temp_log_due_body',
              payloadJson: {
                error: error instanceof Error ? error.message : 'Unknown error',
              },
            },
          });
        }
      }
    }
  }

  /**
   * TEMP_LOG_DUE_SOON job: polls every 30 seconds
   * Per equipment: if ≥1h55m since last temp log (but <2h), send exactly ONE
   * orange "due soon" notification (PUSH + IN_APP). Never re-sends until a
   * new temp log is recorded for that equipment.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async tempLogDueSoonJob() {
    const now = new Date();
    const DUE_SOON_MS = 1 * 60 * 60 * 1000 + 55 * 60 * 1000; // 1h55m
    const OVERDUE_MS = 2 * 60 * 60 * 1000; // 2h

    const establishments = await this.prisma.establishment.findMany({
      where: { subscription: { status: 'ACTIVE' }, active: true },
      select: { id: true, name: true },
    });

    for (const est of establishments) {
      const equipment = await this.prisma.equipment.findMany({
        where: { establishmentId: est.id, status: 'ACTIVE' },
        select: { id: true, name: true },
      });

      for (const eq of equipment) {
        const lastLog = await this.prisma.temperatureLog.findFirst({
          where: { equipmentId: eq.id },
          orderBy: { measuredAt: 'desc' },
        });

        // No logs at all → skip (OVERDUE handles that case)
        if (!lastLog) continue;

        const elapsed = now.getTime() - lastLog.measuredAt.getTime();

        // Only in the "due soon" window: ≥1h55m and <2h
        if (elapsed < DUE_SOON_MS || elapsed >= OVERDUE_MS) continue;

        // Dedup: was DUE_SOON already sent for THIS equipment since its last log?
        const alreadySent = await this.prisma.notificationEvent.findFirst({
          where: {
            establishmentId: est.id,
            type: NotificationEventType.TEMP_LOG_DUE_SOON,
            channel: 'IN_APP',
            createdAt: { gte: lastLog.measuredAt },
            payloadJson: { path: ['equipmentId'], equals: eq.id },
          },
        });

        if (alreadySent) continue;

        this.logger.log(`TEMP_LOG_DUE_SOON for ${est.name} → ${eq.name}`);

        try {
          // PUSH notification
          const users = await this.prisma.user.findMany({
            where: { establishmentId: est.id, role: { in: ['OWNER', 'STAFF'] } },
            select: { id: true },
          });

          if (users.length > 0) {
            await this.push.sendPushBulk(
              users.map((u) => u.id),
              'Relevé bientôt dû',
              `${eq.name} : relevé de température à faire dans 5 min`,
              { type: 'TEMP_LOG_DUE_SOON', equipmentId: eq.id, equipmentName: eq.name, establishmentId: est.id },
            );
          }

          // Single IN_APP notification (also serves as dedup marker)
          await this.prisma.notificationEvent.create({
            data: {
              establishmentId: est.id,
              userId: null,
              type: NotificationEventType.TEMP_LOG_DUE_SOON,
              channel: 'IN_APP',
              status: NotificationStatus.PENDING,
              titleKey: 'Relevé bientôt dû',
              bodyKey: `${eq.name} : relevé de température à faire dans 5 min`,
              payloadJson: { equipmentId: eq.id, equipmentName: eq.name, icon: 'orange-watch' },
            },
          });
        } catch (error) {
          this.logger.error(`Failed TEMP_LOG_DUE_SOON for ${eq.name} (${est.id}):`, error);
        }
      }
    }
  }

  /**
   * TEMP_LOG_OVERDUE job: polls every 30 seconds
   * Per equipment: if ≥2h since last temp log (or no log at all), send exactly
   * ONE red "overdue" notification (PUSH + IN_APP). Never re-sends until a
   * new temp log is recorded for that equipment.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async tempLogOverdueJob() {
    const now = new Date();
    const OVERDUE_MS = 2 * 60 * 60 * 1000; // 2h

    const establishments = await this.prisma.establishment.findMany({
      where: { subscription: { status: 'ACTIVE' }, active: true },
      select: { id: true, name: true },
    });

    for (const est of establishments) {
      const equipment = await this.prisma.equipment.findMany({
        where: { establishmentId: est.id, status: 'ACTIVE' },
        select: { id: true, name: true },
      });

      for (const eq of equipment) {
        const lastLog = await this.prisma.temperatureLog.findFirst({
          where: { equipmentId: eq.id },
          orderBy: { measuredAt: 'desc' },
        });

        // Overdue if no log at all, or last log was ≥2h ago
        const isOverdue = !lastLog || now.getTime() - lastLog.measuredAt.getTime() >= OVERDUE_MS;
        if (!isOverdue) continue;

        // Dedup: was OVERDUE already sent for THIS equipment since its last log?
        // For equipment with no logs ever, check if ANY overdue was ever sent for it.
        const dedupSince = lastLog?.measuredAt ?? new Date(0); // epoch = forever
        const alreadySent = await this.prisma.notificationEvent.findFirst({
          where: {
            establishmentId: est.id,
            type: NotificationEventType.TEMP_LOG_OVERDUE,
            channel: 'IN_APP',
            createdAt: { gte: dedupSince },
            payloadJson: { path: ['equipmentId'], equals: eq.id },
          },
        });

        if (alreadySent) continue;

        this.logger.log(`TEMP_LOG_OVERDUE for ${est.name} → ${eq.name}`);

        try {
          // PUSH notification
          const users = await this.prisma.user.findMany({
            where: { establishmentId: est.id, role: { in: ['OWNER', 'STAFF'] } },
            select: { id: true },
          });

          if (users.length > 0) {
            await this.push.sendPushBulk(
              users.map((u) => u.id),
              'Relevé en retard',
              `${eq.name} : relevé de température en retard (plus de 2h)`,
              { type: 'TEMP_LOG_OVERDUE', equipmentId: eq.id, equipmentName: eq.name, establishmentId: est.id },
            );
          }

          // Single IN_APP notification (also serves as dedup marker)
          await this.prisma.notificationEvent.create({
            data: {
              establishmentId: est.id,
              userId: null,
              type: NotificationEventType.TEMP_LOG_OVERDUE,
              channel: 'IN_APP',
              status: NotificationStatus.PENDING,
              titleKey: 'Relevé en retard',
              bodyKey: `${eq.name} : relevé de température en retard (plus de 2h)`,
              payloadJson: { equipmentId: eq.id, equipmentName: eq.name, icon: 'red-watch' },
            },
          });
        } catch (error) {
          this.logger.error(`Failed TEMP_LOG_OVERDUE for ${eq.name} (${est.id}):`, error);
        }
      }
    }
  }

  /**
   * CLEANING_DUE job: Daily at 20:00
   * Find establishments with uncompleted cleaning for today
   * Send CLEANING_DUE push to owner/staff
   */
  @Cron('0 20 * * *')
  async cleaningDueJob() {
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);

    const establishments = await this.prisma.establishment.findMany({
      where: {
        subscription: { status: 'ACTIVE' },
        active: true,
      },
      select: { id: true, name: true },
    });

    for (const est of establishments) {
      const plan = await this.prisma.cleaningPlan.findUnique({
        where: { establishmentId_dateKey: { establishmentId: est.id, dateKey } },
      });

      if (!plan || !plan.completedAt) {
        this.logger.log(`CLEANING_DUE for ${est.name}`);

        try {
          const users = await this.prisma.user.findMany({
            where: {
              establishmentId: est.id,
              role: { in: ['OWNER', 'STAFF'] },
            },
            select: { id: true },
          });

          if (users.length > 0) {
            await this.push.sendPushBulk(
              users.map((u) => u.id),
              'Nettoyage à faire',
              'La checklist de nettoyage du jour doit être complétée.',
              {
                type: 'CLEANING_DUE',
                establishmentId: est.id,
              },
            );

            await this.prisma.notificationEvent.create({
              data: {
                establishmentId: est.id,
                userId: null,
                type: NotificationEventType.CLEANING_OVERDUE,
                channel: 'PUSH',
                status: NotificationStatus.SENT,
                titleKey: 'cleaning_due_title',
                bodyKey: 'cleaning_due_body',
                payloadJson: { dateKey },
              },
            });
          }
        } catch (error) {
          this.logger.error(
            `Failed to send CLEANING_DUE for ${est.id}:`,
            error,
          );
          await this.prisma.notificationEvent.create({
            data: {
              establishmentId: est.id,
              userId: null,
              type: NotificationEventType.CLEANING_OVERDUE,
              channel: 'PUSH',
              status: NotificationStatus.FAILED,
              titleKey: 'cleaning_due_title',
              bodyKey: 'cleaning_due_body',
              payloadJson: {
                error: error instanceof Error ? error.message : 'Unknown error',
              },
            },
          });
        }
      }
    }
  }

  /**
   * CLEANING_OVERDUE job: Daily at 08:00
   * Find establishments with uncompleted cleaning for yesterday
   * Send CLEANING_OVERDUE push to owner/staff with deduplication
   */
  @Cron('0 8 * * *')
  async cleaningOverdueJob() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = yesterday.toISOString().slice(0, 10);

    const establishments = await this.prisma.establishment.findMany({
      where: {
        subscription: { status: 'ACTIVE' },
        active: true,
      },
      select: { id: true, name: true },
    });

    for (const est of establishments) {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const recentEvent = await this.prisma.notificationEvent.findFirst({
        where: {
          establishmentId: est.id,
          type: NotificationEventType.CLEANING_OVERDUE,
          createdAt: { gte: todayStart },
          status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
        },
      });

      if (recentEvent) {
        this.logger.log(
          `CLEANING_OVERDUE already sent for ${est.name} today, skipping`,
        );
        continue;
      }

      const plan = await this.prisma.cleaningPlan.findUnique({
        where: { establishmentId_dateKey: { establishmentId: est.id, dateKey } },
      });

      if (!plan || !plan.completedAt) {
        this.logger.log(`CLEANING_OVERDUE for ${est.name}`);

        try {
          const users = await this.prisma.user.findMany({
            where: {
              establishmentId: est.id,
              role: { in: ['OWNER', 'STAFF'] },
            },
            select: { id: true },
          });

          if (users.length > 0) {
            await this.push.sendCleaningOverdueAlert(est.id);

            await this.prisma.notificationEvent.create({
              data: {
                establishmentId: est.id,
                userId: null,
                type: NotificationEventType.CLEANING_OVERDUE,
                channel: 'PUSH',
                status: NotificationStatus.SENT,
                titleKey: 'cleaning_overdue_title',
                bodyKey: 'cleaning_overdue_body',
                payloadJson: { dateKey },
              },
            });
          }
        } catch (error) {
          this.logger.error(
            `Failed to send CLEANING_OVERDUE for ${est.id}:`,
            error,
          );
          await this.prisma.notificationEvent.create({
            data: {
              establishmentId: est.id,
              userId: null,
              type: NotificationEventType.CLEANING_OVERDUE,
              channel: 'PUSH',
              status: NotificationStatus.FAILED,
              titleKey: 'cleaning_overdue_title',
              bodyKey: 'cleaning_overdue_body',
              payloadJson: {
                error: error instanceof Error ? error.message : 'Unknown error',
              },
            },
          });
        }
      }
    }
  }

  /**
   * TEMP_LOG_REMINDER job (manual trigger only via POST /jobs/temp-log-reminder)
   * Find equipment where last log was 1h45m ago (15 min before 2h deadline)
   * Send a reminder notification
   */
  async tempLogReminderJob() {
    const now = new Date();
    const reminderThreshold = 1 * 60 * 60 * 1000 + 45 * 60 * 1000; // 1h45m
    const overdueThreshold = 2 * 60 * 60 * 1000; // 2h

    const establishments = await this.prisma.establishment.findMany({
      where: {
        subscription: { status: 'ACTIVE' },
        active: true,
      },
      select: { id: true, name: true },
    });

    for (const est of establishments) {
      // Check deduplication: has TEMP_LOG_REMINDER been sent in last 30 min?
      const recentReminder = await this.prisma.notificationEvent.findFirst({
        where: {
          establishmentId: est.id,
          type: NotificationEventType.TEMP_LOG_DUE,
          titleKey: 'temp_log_reminder_title',
          createdAt: {
            gte: new Date(now.getTime() - 30 * 60 * 1000), // 30 min dedup
          },
          status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
        },
      });

      if (recentReminder) {
        continue;
      }

      // Find ACTIVE equipment
      const equipment = await this.prisma.equipment.findMany({
        where: { establishmentId: est.id, status: 'ACTIVE' },
        select: { id: true, name: true },
      });

      // For each equipment, check last log - we want logs between 1h45m and 2h old
      const needsReminder: string[] = [];
      for (const eq of equipment) {
        const lastLog = await this.prisma.temperatureLog.findFirst({
          where: { equipmentId: eq.id },
          orderBy: { measuredAt: 'desc' },
        });
        if (lastLog) {
          const timeSinceLastLog = now.getTime() - lastLog.measuredAt.getTime();
          // Only send reminder if between 1h45m and 2h (not yet overdue)
          if (
            timeSinceLastLog >= reminderThreshold &&
            timeSinceLastLog < overdueThreshold
          ) {
            needsReminder.push(eq.name);
          }
        }
      }

      if (needsReminder.length > 0) {
        this.logger.log(
          `TEMP_LOG_REMINDER for ${est.name}: ${needsReminder.join(', ')}`,
        );

        try {
          // Send push notification to staff/owner
          const users = await this.prisma.user.findMany({
            where: {
              establishmentId: est.id,
              role: { in: ['OWNER', 'STAFF'] },
            },
            select: { id: true },
          });

          if (users.length > 0) {
            await this.push.sendPushBulk(
              users.map((u) => u.id),
              'Relevé de température bientôt dû',
              `${needsReminder.length} équipement(s) doivent être relevés dans 15 minutes.`,
              {
                type: 'TEMP_LOG_REMINDER',
                establishmentId: est.id,
                equipment: needsReminder,
              },
            );

            await this.prisma.notificationEvent.create({
              data: {
                establishmentId: est.id,
                userId: null,
                type: NotificationEventType.TEMP_LOG_DUE,
                channel: 'PUSH',
                status: NotificationStatus.SENT,
                titleKey: 'temp_log_reminder_title',
                bodyKey: 'temp_log_reminder_body',
                payloadJson: { equipment: needsReminder },
              },
            });
          }
        } catch (error) {
          this.logger.error(
            `Failed to send TEMP_LOG_REMINDER for ${est.id}:`,
            error,
          );
        }
      }
    }
  }

  // Helper: get current week key (YYYY-WW)
  private getCurrentWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-${String(week).padStart(2, '0')}`;
  }

  // Helper: get previous week key (YYYY-WW)
  private getPreviousWeekKey(date: Date): string {
    const d = new Date(date);
    d.setDate(d.getDate() - 7);
    const year = d.getFullYear();
    const week = this.getWeekNumber(d);
    return `${year}-${String(week).padStart(2, '0')}`;
  }

  // Helper: ISO week number calculation
  private getWeekNumber(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
