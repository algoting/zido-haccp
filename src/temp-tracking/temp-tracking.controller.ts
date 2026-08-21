import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TempTrackingService } from './temp-tracking.service';
import { CreateTempTrackingDto } from './dto/create-temp-tracking.dto';
import { UpdateTempTrackingDto } from './dto/update-temp-tracking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';
import { AuditService } from '../audit/audit.service';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';

interface AuthenticatedRequest extends ExpressRequest {
  user: User;
}

@Controller('temp-tracking')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class TempTrackingController {
  constructor(
    private tempTrackingService: TempTrackingService,
    private auditService: AuditService,
  ) {}

  private requireEstablishmentId(user: User): string {
    if (!user.establishmentId) {
      throw new BadRequestException('establishmentId is required');
    }
    return user.establishmentId;
  }

  @Get()
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async listTempTrackings(@Request() req: AuthenticatedRequest) {
    const establishmentId = this.requireEstablishmentId(req.user);
    return this.tempTrackingService.findAll(establishmentId);
  }

  @Post()
  @Roles('OWNER', 'STAFF')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async createTempTracking(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateTempTrackingDto,
    @UploadedFile()
    file?: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const tracking = await this.tempTrackingService.create(
      establishmentId,
      req.user.id,
      dto,
      file,
    );

    try {
      await this.auditService.logAction(
        establishmentId,
        'TEMP_TRACKING_CREATED' as any,
        'TempTracking',
        tracking.id,
        null,
        tracking,
        req.user,
      );
    } catch {}

    return tracking;
  }

  @Put(':id')
  @Roles('OWNER', 'STAFF')
  async updateTempTracking(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTempTrackingDto,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const updated = await this.tempTrackingService.update(
      id,
      establishmentId,
      dto,
    );

    try {
      await this.auditService.logAction(
        establishmentId,
        'TEMP_TRACKING_UPDATED' as any,
        'TempTracking',
        updated.id,
        null,
        updated,
        req.user,
      );
    } catch {}

    return updated;
  }

  @Delete(':id')
  @Roles('OWNER')
  async deleteTempTracking(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const result = await this.tempTrackingService.delete(id, establishmentId);

    try {
      await this.auditService.logAction(
        establishmentId,
        'TEMP_TRACKING_DELETED' as any,
        'TempTracking',
        id,
        null,
        null,
        req.user,
      );
    } catch {}

    return result;
  }
}
