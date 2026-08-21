import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationChannel,
  NotificationEventType,
  NotificationStatus,
} from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createInApp(params: {
    establishmentId: string;
    userId?: string | null; // null = broadcast
    type: NotificationEventType;
    titleKey: string;
    bodyKey: string;
    payload?: unknown;
  }) {
    return this.prisma.notificationEvent.create({
      data: {
        establishmentId: params.establishmentId,
        userId: params.userId ?? null,
        type: params.type,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        titleKey: params.titleKey,
        bodyKey: params.bodyKey,
        payloadJson: (params.payload as Prisma.InputJsonValue) ?? null,
      },
    });
  }

  private requireEstablishment(user: User) {
    if (!user.establishmentId) {
      throw new ForbiddenException(
        "L'utilisateur n'est pas lié à un établissement",
      );
    }
    return user.establishmentId;
  }

  async listInApp(user: User) {
    const establishmentId = this.requireEstablishment(user);

    return this.prisma.notificationEvent.findMany({
      where: {
        establishmentId,
        channel: NotificationChannel.IN_APP,
        status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
        OR: [{ userId: null }, { userId: user.id }],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listAllInApp(user: User) {
    const establishmentId = this.requireEstablishment(user);

    return this.prisma.notificationEvent.findMany({
      where: {
        establishmentId,
        channel: NotificationChannel.IN_APP,
        OR: [{ userId: null }, { userId: user.id }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(user: User, notificationId: string) {
    const establishmentId = this.requireEstablishment(user);

    const notif = await this.prisma.notificationEvent.findFirst({
      where: {
        id: notificationId,
        establishmentId,
        channel: NotificationChannel.IN_APP,
        OR: [{ userId: null }, { userId: user.id }],
      },
      select: { id: true },
    });

    if (!notif) {
      throw new NotFoundException('Notification non trouvée');
    }

    return this.prisma.notificationEvent.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.SKIPPED },
    });
  }

  async unreadCount(user: User) {
    const establishmentId = this.requireEstablishment(user);

    return this.prisma.notificationEvent.count({
      where: {
        establishmentId,
        channel: NotificationChannel.IN_APP,
        status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
        OR: [{ userId: null }, { userId: user.id }],
      },
    });
  }
}
