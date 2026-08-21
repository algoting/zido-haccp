import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get('pending')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getPending(@Request() req: any) {
    const establishmentId = req.user.establishmentId;
    if (!establishmentId) return [];
    return this.tasksService.getPendingTasks(establishmentId);
  }

  @Get('history')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getHistory(
    @Request() req: any,
    @Query('days') days?: string,
  ) {
    const establishmentId = req.user.establishmentId;
    if (!establishmentId) return [];
    const numDays = days ? Math.min(Math.max(parseInt(days, 10) || 30, 1), 90) : 30;
    return this.tasksService.getTasksHistory(establishmentId, numDays);
  }
}
