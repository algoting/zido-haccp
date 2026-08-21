import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

@Injectable()
export class PushNotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Register Expo push token for a user
   * Called on mobile app login/registration
   */
  async registerPushToken(userId: string, expoPushToken: string) {
    // Validate token format
    if (!Expo.isExpoPushToken(expoPushToken)) {
      console.warn(`Invalid Expo push token: ${String(expoPushToken)}`);
      return false;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken },
    });
  }

  /**
   * Send push notification to a user
   * Returns success status & stores in NotificationEvent
   */
  async sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.expoPushToken) {
      console.warn(`No push token for user ${userId}`);
      return false;
    }

    try {
      const ticket = await expo.sendPushNotificationsAsync([
        {
          to: user.expoPushToken,
          sound: 'default',
          title,
          body,
          data: data ?? {},
          badge: 1,
        },
      ]);

      return ticket[0].status === 'ok';
    } catch (error) {
      console.error(`Failed to send push to ${userId}:`, error);
      return false;
    }
  }

  /**
   * Send bulk pushes to multiple users (for reminders)
   */
  async sendPushBulk(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, expoPushToken: { not: null } },
    });

    if (users.length === 0) {
      return [];
    }

    const messages = users
      .filter((user) => user.expoPushToken)
      .map((user) => ({
        to: user.expoPushToken as string,
        sound: 'default',
        title,
        body,
        data: data ?? {},
        badge: 1,
      }));

    try {
      const tickets = await expo.sendPushNotificationsAsync(messages);
      return tickets;
    } catch (error) {
      console.error('Failed to send bulk pushes:', error);
      return [];
    }
  }

  /**
   * Send TEMP_OUT_OF_RANGE alert
   */
  async sendTempOutOfRangeAlert(
    establishmentId: string,
    equipmentName: string,
    temperature: number,
    minTemp: number,
    maxTemp: number,
  ) {
    const users = await this.prisma.user.findMany({
      where: { establishmentId, role: { in: ['OWNER', 'STAFF', 'AUDITOR'] } },
    });

    return this.sendPushBulk(
      users.map((u) => u.id),
      'Alerte Température',
      `${equipmentName}: ${temperature}°C (seuils: ${minTemp}–${maxTemp}°C)`,
      {
        type: 'TEMP_OUT_OF_RANGE',
        equipmentName,
        temperature,
        establishmentId,
      },
    );
  }

  /**
   * Send CLEANING_OVERDUE reminder
   */
  async sendCleaningOverdueAlert(establishmentId: string) {
    const users = await this.prisma.user.findMany({
      where: { establishmentId, role: { in: ['OWNER', 'STAFF'] } },
    });

    return this.sendPushBulk(
      users.map((u) => u.id),
      'Nettoyage en retard',
      "La checklist hebdomadaire n'a pas été complétée. Merci de la mettre à jour.",
      {
        type: 'CLEANING_OVERDUE',
        establishmentId,
      },
    );
  }

  /**
   * Send TEMP_LOG_DUE reminder (every 2 hours)
   */
  async sendTempLogDueAlert(establishmentId: string) {
    const users = await this.prisma.user.findMany({
      where: { establishmentId, role: { in: ['OWNER', 'STAFF'] } },
    });

    return this.sendPushBulk(
      users.map((u) => u.id),
      'Relevé de température à faire',
      'Veuillez enregistrer la température des équipements.',
      {
        type: 'TEMP_LOG_DUE',
        establishmentId,
      },
    );
  }

  /**
   * Send TEMP_LOG_DUE_SOON reminder (5 minutes before 2-hour mark)
   */
  async sendTempLogDueSoonAlert(
    establishmentId: string,
    equipmentNames: string[],
  ) {
    const users = await this.prisma.user.findMany({
      where: { establishmentId, role: { in: ['OWNER', 'STAFF'] } },
    });

    const equipmentList = equipmentNames.slice(0, 3).join(', ');
    const moreCount = equipmentNames.length > 3 ? ` +${equipmentNames.length - 3}` : '';

    return this.sendPushBulk(
      users.map((u) => u.id),
      'Relevé de température dans 5 min',
      `Équipements: ${equipmentList}${moreCount}`,
      {
        type: 'TEMP_LOG_DUE_SOON',
        establishmentId,
        equipmentNames,
      },
    );
  }

  /**
   * Send TEMP_LOG_OVERDUE alert (at the 2-hour mark)
   */
  async sendTempLogOverdueAlert(
    establishmentId: string,
    equipmentNames: string[],
  ) {
    const users = await this.prisma.user.findMany({
      where: { establishmentId, role: { in: ['OWNER', 'STAFF'] } },
    });

    const equipmentList = equipmentNames.slice(0, 3).join(', ');
    const moreCount = equipmentNames.length > 3 ? ` +${equipmentNames.length - 3}` : '';

    return this.sendPushBulk(
      users.map((u) => u.id),
      '⚠️ Relevé de température en retard',
      `Équipements en retard: ${equipmentList}${moreCount}`,
      {
        type: 'TEMP_LOG_OVERDUE',
        establishmentId,
        equipmentNames,
      },
    );
  }

  /**
   * Check Expo push notification status
   * (Optional: for debugging failed notifications)
   */
  async checkPushTicketStatus(ticketIds: string[]) {
    try {
      const status = await expo.getPushNotificationReceiptsAsync(ticketIds);
      return status;
    } catch (error) {
      console.error('Failed to check push receipts:', error);
      return null;
    }
  }
}
