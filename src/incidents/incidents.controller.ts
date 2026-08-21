import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole, IncidentStatus } from '@prisma/client';
import type { User } from '@prisma/client';
import { CreateCorrectiveActionDto } from './dto/create-corrective-action.dto';
import { CloseIncidentDto } from './dto/close-incident.dto';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';

@Controller('incidents')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.AUDITOR)
  list(
    @CurrentUser() user: User,
    @Query('status') status?: IncidentStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 50;
    return this.incidentsService.list(user, status, skipNum, takeNum);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.AUDITOR)
  getById(@CurrentUser() user: User, @Param('id') id: string) {
    return this.incidentsService.getById(user, id);
  }

  @Post(':id/corrective-actions')
  @Roles(UserRole.OWNER)
  addCorrectiveAction(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateCorrectiveActionDto,
  ) {
    return this.incidentsService.addCorrectiveAction(user, id, dto);
  }

  @Post(':id/close')
  @Roles(UserRole.OWNER)
  close(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CloseIncidentDto,
  ) {
    return this.incidentsService.close(user, id, dto);
  }
}
