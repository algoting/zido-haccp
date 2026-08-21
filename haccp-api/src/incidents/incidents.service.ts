import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@prisma/client';
import { CreateCorrectiveActionDto } from './dto/create-corrective-action.dto';
import { CloseIncidentDto } from './dto/close-incident.dto';
import { IncidentStatus, NotificationEventType, TemperatureConformity } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class IncidentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  private requireEstablishment(user: User): string {
    if (!user.establishmentId) {
      throw new ForbiddenException(
        "L'utilisateur n'est pas lié à un établissement",
      );
    }
    return user.establishmentId;
  }

  async list(
    user: User,
    status?: IncidentStatus,
    skip: number = 0,
    take: number = 50,
  ) {
    const establishmentId = this.requireEstablishment(user);

    const [incidents, total] = await Promise.all([
      this.prisma.incident.findMany({
        where: {
          establishmentId,
          ...(status ? { status } : {}),
        },
        include: {
          equipment: true,
          triggerTemperatureLog: true,
          correctiveActions: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { openedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.incident.count({
        where: {
          establishmentId,
          ...(status ? { status } : {}),
        },
      }),
    ]);

    return {
      data: incidents,
      total,
      skip,
      take,
    };
  }

  async getById(user: User, id: string) {
    const establishmentId = this.requireEstablishment(user);

    const incident = await this.prisma.incident.findFirst({
      where: { id, establishmentId },
      include: {
        equipment: true,
        triggerTemperatureLog: true,
        correctiveActions: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!incident) throw new NotFoundException('Incident non trouvé');
    return incident;
  }

  async addCorrectiveAction(
    user: User,
    incidentId: string,
    dto: CreateCorrectiveActionDto,
  ) {
    const establishmentId = this.requireEstablishment(user);

    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, establishmentId },
      select: { id: true, status: true },
    });

    if (!incident) throw new NotFoundException('Incident non trouvé');
    if (incident.status === IncidentStatus.CLOSED) {
      throw new BadRequestException("L'incident est déjà clos");
    }

    const action = await this.prisma.correctiveAction.create({
      data: {
        incidentId: incident.id,
        actionText: dto.actionText,
        createdByUserId: user.id,
      },
    });

    // Audit: corrective action added
    await this.audit.log({
      establishmentId,
      user,
      action: 'CORRECTIVE_ACTION_ADDED',
      entityType: 'CorrectiveAction',
      entityId: action.id,
      afterJson: action,
    });

    return action;
  }

  async close(user: User, incidentId: string, dto?: CloseIncidentDto) {
    const establishmentId = this.requireEstablishment(user);

    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, establishmentId },
      select: { id: true, status: true, equipmentId: true },
    });

    if (!incident) throw new NotFoundException('Incident non trouvé');
    if (incident.status === IncidentStatus.CLOSED) {
      throw new BadRequestException("L'incident est déjà clos");
    }

    const actionsCount = await this.prisma.correctiveAction.count({
      where: { incidentId: incident.id },
    });

    if (actionsCount < 1) {
      throw new BadRequestException(
        'You must add at least one corrective action before closing',
      );
    }

    // If a corrective temperature was provided, create a new temperature log
    if (dto?.correctiveTemperatureC !== undefined) {
      const equipment = await this.prisma.equipment.findFirst({
        where: { id: incident.equipmentId, establishmentId },
      });

      if (equipment) {
        const conformity =
          (equipment.minTempC != null &&
            dto.correctiveTemperatureC < equipment.minTempC) ||
          (equipment.maxTempC != null &&
            dto.correctiveTemperatureC > equipment.maxTempC)
            ? TemperatureConformity.OUT_OF_RANGE
            : TemperatureConformity.OK;

        const tempLog = await this.prisma.temperatureLog.create({
          data: {
            equipmentId: equipment.id,
            establishmentId,
            temperatureC: dto.correctiveTemperatureC,
            measuredAt: new Date(),
            conformity,
            recordedByUserId: user.id,
          },
        });

        await this.audit.log({
          establishmentId,
          user,
          action: 'TEMPERATURE_LOG_CREATED',
          entityType: 'TemperatureLog',
          entityId: tempLog.id,
          afterJson: { ...tempLog, source: 'INCIDENT_RESOLUTION' },
        });
      }
    }

    const updated = await this.prisma.incident.update({
      where: { id: incident.id },
      data: {
        status: IncidentStatus.CLOSED,
        closedAt: new Date(),
        closedByUserId: user.id,
      },
      include: {
        equipment: { select: { id: true, name: true } },
      },
    });

    // Audit: incident closed
    await this.audit.log({
      establishmentId,
      user,
      action: 'INCIDENT_CLOSED',
      entityType: 'Incident',
      entityId: updated.id,
      afterJson: updated,
    });

    // Notification event: incident closed (broadcast)
    await this.notifications.createInApp({
      establishmentId,
      userId: null,
      type: NotificationEventType.INCIDENT_CLOSED,
      titleKey: 'notif.incident.closed.title',
      bodyKey: 'notif.incident.closed.body',
      payload: {
        incidentId: updated.id,
        equipmentId: updated.equipmentId,
        equipmentName: updated.equipment?.name ?? null,
        closedByUserId: user.id,
        closedAt: updated.closedAt,
      } as any,
    });

    return updated;
  }
}
