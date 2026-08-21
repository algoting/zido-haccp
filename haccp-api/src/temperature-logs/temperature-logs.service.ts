import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

const TEMP_EXCLUDED_TYPES = ['Friteuse', 'Four'];
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemperatureLogDto } from './dto/create-temperature-log.dto';
import {
  TemperatureConformity,
  IncidentType,
  NotificationEventType,
} from '@prisma/client';
import type { User } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TemperatureLogsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  async create(user: User, dto: CreateTemperatureLogDto) {
    if (!user.establishmentId) {
      throw new ForbiddenException(
        "L'utilisateur n'est pas lié à un établissement",
      );
    }

    // 1) Load equipment scoped to establishment
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id: dto.equipmentId,
        establishmentId: user.establishmentId,
        status: 'ACTIVE',
      },
    });

    if (!equipment) {
      throw new NotFoundException('Équipement non trouvé');
    }

    if (TEMP_EXCLUDED_TYPES.includes(equipment.type)) {
      throw new BadRequestException(
        `Les équipements de type "${equipment.type}" ne font pas l'objet de relevés de température`,
      );
    }

    // 2) Compute conformity (a null bound means that side is unconstrained)
    const conformity =
      (equipment.minTempC != null && dto.temperatureC < equipment.minTempC) ||
      (equipment.maxTempC != null && dto.temperatureC > equipment.maxTempC)
        ? TemperatureConformity.OUT_OF_RANGE
        : TemperatureConformity.OK;

    // 3) Create temperature log
    const log = await this.prisma.temperatureLog.create({
      data: {
        equipmentId: equipment.id,
        establishmentId: user.establishmentId,
        temperatureC: dto.temperatureC,
        measuredAt: new Date(dto.measuredAt),
        conformity,
        recordedByUserId: user.id,
      },
    });

    // Audit: temperature log created
    await this.audit.log({
      establishmentId: user.establishmentId,
      user,
      action: 'TEMPERATURE_LOG_CREATED',
      entityType: 'TemperatureLog',
      entityId: log.id,
      afterJson: log,
    });

    // 4) If OUT_OF_RANGE, create incident linked to this log (idempotent-ish)
    if (conformity === TemperatureConformity.OUT_OF_RANGE) {
      let incidentId: string | null = null;
      let incidentCreated = false;

      try {
        console.log(`[TEMP] Creating incident for temperature log ${log.id}`);
        const incident = await this.prisma.incident.create({
          data: {
            type: IncidentType.TEMPERATURE,
            establishmentId: user.establishmentId,
            equipmentId: equipment.id,
            triggerTemperatureLogId: log.id,
          },
        });

        incidentId = incident.id;
        incidentCreated = true;
        console.log(`[TEMP] Incident created: ${incident.id}`);

        // Audit: incident created
        await this.audit.log({
          establishmentId: user.establishmentId,
          user,
          action: 'INCIDENT_CREATED',
          entityType: 'Incident',
          entityId: incident.id,
          afterJson: incident,
        });
      } catch (e: any) {
        console.log(
          `[TEMP] Incident creation failed: ${e.message}, looking for existing...`,
        );
        // Most likely: unique constraint on triggerTemperatureLogId (retry)
        const existing = await this.prisma.incident.findUnique({
          where: { triggerTemperatureLogId: log.id },
          select: { id: true },
        });

        incidentId = existing?.id ?? null;
        incidentCreated = true; // logically, incident exists
        console.log(`[TEMP] Found existing incident: ${incidentId}`);

        // Optional audit on retry: you can keep or remove this
        if (incidentId) {
          await this.audit.log({
            establishmentId: user.establishmentId,
            user,
            action: 'INCIDENT_CREATED',
            entityType: 'Incident',
            entityId: incidentId,
            afterJson: { note: 'incident already existed (retry)' } as any,
          });
        }
      }

      // Notification event (in-app): broadcast to establishment members
      try {
        await this.notifications.createInApp({
          establishmentId: user.establishmentId,
          userId: null, // broadcast
          type: NotificationEventType.TEMP_OUT_OF_RANGE,
          titleKey: 'notif.temp.out_of_range.title',
          bodyKey: 'notif.temp.out_of_range.body',
          payload: {
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            temperatureLogId: log.id,
            incidentId,
            temperatureC: dto.temperatureC,
            measuredAt: dto.measuredAt,
            minTempC: equipment.minTempC,
            maxTempC: equipment.maxTempC,
          } as any,
        });
      } catch (notificationError: any) {
        console.error(
          'Failed to create notification:',
          notificationError.message,
        );
        // Don't fail the entire operation if notification fails
      }

      return { log, incidentCreated, incidentId };
    }

    return {
      log,
      incidentCreated: false,
      incidentId: null,
    };
  }

  async listForEquipment(user: User, equipmentId: string) {
    if (!user.establishmentId) {
      return [];
    }

    // Ensure equipment belongs to establishment
    const equipment = await this.prisma.equipment.findFirst({
      where: { id: equipmentId, establishmentId: user.establishmentId },
      select: { id: true },
    });

    if (!equipment) {
      throw new NotFoundException('Équipement non trouvé');
    }

    return this.prisma.temperatureLog.findMany({
      where: { equipmentId, establishmentId: user.establishmentId },
      orderBy: { measuredAt: 'desc' },
      take: 200,
    });
  }

  async listByEstablishment(user: User, skip: number = 0, take: number = 50) {
    if (!user.establishmentId) {
      return {
        data: [],
        total: 0,
        skip,
        take,
      };
    }

    const [logs, total] = await Promise.all([
      this.prisma.temperatureLog.findMany({
        where: { establishmentId: user.establishmentId },
        orderBy: { measuredAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.temperatureLog.count({
        where: { establishmentId: user.establishmentId },
      }),
    ]);

    return {
      data: logs,
      total,
      skip,
      take,
    };
  }
}
