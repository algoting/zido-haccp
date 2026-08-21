import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.AUDITOR)
  summary(@CurrentUser() user: User) {
    return this.dashboard.summary(user);
  }
}
