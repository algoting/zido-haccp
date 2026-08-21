import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { TemperatureLogsService } from './temperature-logs.service';
import { CreateTemperatureLogDto } from './dto/create-temperature-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';

@Controller('temperature-logs')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class TemperatureLogsController {
  constructor(
    private readonly temperatureLogsService: TemperatureLogsService,
  ) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.STAFF)
  create(@CurrentUser() user: User, @Body() dto: CreateTemperatureLogDto) {
    return this.temperatureLogsService.create(user, dto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.AUDITOR)
  list(
    @CurrentUser() user: User,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '50',
  ) {
    return this.temperatureLogsService.listByEstablishment(
      user,
      parseInt(skip),
      parseInt(take),
    );
  }

  @Get('equipment/:equipmentId')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.AUDITOR)
  listForEquipment(
    @CurrentUser() user: User,
    @Param('equipmentId') equipmentId: string,
  ) {
    return this.temperatureLogsService.listForEquipment(user, equipmentId);
  }
}
