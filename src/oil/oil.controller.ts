import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { OilService } from './oil.service';
import { CreateOilStationDto } from './dto/create-oil-station.dto';
import { RecordOilCheckDto } from './dto/record-oil-check.dto';
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

@Controller('oil')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class OilController {
  constructor(
    private oilService: OilService,
    private auditService: AuditService,
  ) {}

  private requireEstablishmentId(user: User): string {
    if (!user.establishmentId) {
      throw new BadRequestException('establishmentId is required');
    }
    return user.establishmentId;
  }

  @Get('/stations')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getStations(@Request() req: AuthenticatedRequest) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const stations = await this.oilService.getStations(establishmentId);
    return {
      stations: stations.map((station) => ({
        ...station,
        lastCheck: station.checks[0] || null,
      })),
    };
  }

  @Post('/stations')
  @Roles('OWNER')
  @UseGuards(SubscriptionStateGuard)
  async createStation(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateOilStationDto,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const station = await this.oilService.createStation(
      establishmentId,
      dto.name,
    );

    await this.auditService.logAction(
      establishmentId,
      'OIL_STATION_CREATED',
      'OilStation',
      station.id,
      null,
      station,
      req.user,
    );

    return station;
  }

  @Post('/checks')
  @Roles('OWNER', 'STAFF')
  @UseGuards(SubscriptionStateGuard)
  async recordCheck(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RecordOilCheckDto,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);

    // Auto-derive quality from polarity if not explicitly set
    let quality = dto.quality;
    if (!quality && dto.polarity !== undefined) {
      quality = dto.polarity <= 25 ? 'GOOD' : 'BAD';
    }
    if (!quality) {
      quality = 'GOOD';
    }

    const check = await this.oilService.recordCheck(
      dto.stationId,
      establishmentId,
      req.user.id,
      {
        quality,
        oilChanged: dto.oilChanged ?? false,
        polarity: dto.polarity,
        method: dto.method,
        notes: dto.notes,
      },
    );

    await this.auditService.logAction(
      establishmentId,
      'OIL_CHECK_RECORDED',
      'OilCheck',
      check.id,
      null,
      check,
      req.user,
    );

    return check;
  }

  @Get('/stations/:stationId/history')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getCheckHistory(
    @Param('stationId') stationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);
    return this.oilService.getCheckHistory(stationId, establishmentId);
  }
}
