import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@prisma/client';
import { IncidentStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private requireEstablishment(user: User) {
    if (!user.establishmentId) {
      throw new ForbiddenException(
        "L'utilisateur n'est pas lié à un établissement",
      );
    }
    return user.establishmentId;
  }

  async summary(user: User) {
    const establishmentId = this.requireEstablishment(user);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // Get all active equipment that requires temperature monitoring (exclude oil-only / cleaning-only types)
    const equipment = await this.prisma.equipment.findMany({
      where: { establishmentId, status: 'ACTIVE', type: { notIn: ['Friteuse', 'Four'] } },
      include: {
        temperatureLogs: {
          orderBy: { measuredAt: 'desc' },
          take: 1,
        },
      },
    });

    // Count equipment needing readings (no log in last 2 hours)
    const equipmentNeedingReadings = equipment.filter((eq) => {
      const lastLog = eq.temperatureLogs[0];
      if (!lastLog) return true; // Never logged
      return new Date(lastLog.measuredAt) < twoHoursAgo;
    });

    // Count equipment overdue (no log or last log > 2 hours ago)
    const equipmentOverdue = equipmentNeedingReadings;

    const [openIncidentsCount, unreadNotifications] = await Promise.all([
      this.prisma.incident.count({
        where: { establishmentId, status: IncidentStatus.OPEN },
      }),
      this.notifications.unreadCount(user),
    ]);

    return {
      equipmentActiveCount: equipment.length,
      equipmentNeedingReadings: equipmentNeedingReadings.length,
      equipmentOverdue: equipmentOverdue.length,
      openIncidentsCount,
      unreadNotifications,
    };
  }
}
