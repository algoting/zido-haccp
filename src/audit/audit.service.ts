import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import type { User } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    establishmentId: string;
    action: AuditAction;
    entityType: string;
    entityId?: string | null;
    user?: User | null;
    beforeJson?: any;
    afterJson?: any;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    return this.prisma.auditLog.create({
      data: {
        establishmentId: params.establishmentId,
        actorUserId: params.user?.id ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        beforeJson: params.beforeJson ?? null,
        afterJson: params.afterJson ?? null,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }

  async logAction(
    establishmentId: string,
    action: AuditAction | string,
    entityType: string,
    entityId: string,
    beforeJson: any,
    afterJson: any,
    user?: User | null,
    ip?: string | null,
    userAgent?: string | null,
  ) {
    return this.log({
      establishmentId,
      action: action as AuditAction,
      entityType,
      entityId,
      beforeJson,
      afterJson,
      user,
      ip,
      userAgent,
    });
  }
}
