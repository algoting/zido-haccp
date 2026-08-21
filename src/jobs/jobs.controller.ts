import { Controller, Post, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post('/temp-log-due')
  @Roles('PLATFORM_ADMIN')
  async runTempLogDueJob() {
    return this.jobsService.tempLogDueJob();
  }

  @Post('/temp-log-reminder')
  @Roles('PLATFORM_ADMIN')
  async runTempLogReminderJob() {
    return this.jobsService.tempLogReminderJob();
  }

  @Post('/temp-log-due-soon')
  @Roles('PLATFORM_ADMIN')
  async runTempLogDueSoonJob() {
    await this.jobsService.tempLogDueSoonJob();
    return { success: true, message: 'TEMP_LOG_DUE_SOON job executed' };
  }

  @Post('/temp-log-overdue')
  @Roles('PLATFORM_ADMIN')
  async runTempLogOverdueJob() {
    await this.jobsService.tempLogOverdueJob();
    return { success: true, message: 'TEMP_LOG_OVERDUE job executed' };
  }

  @Post('/cleaning-due')
  @Roles('PLATFORM_ADMIN')
  async runCleaningDueJob() {
    return this.jobsService.cleaningDueJob();
  }

  @Post('/cleaning-overdue')
  @Roles('PLATFORM_ADMIN')
  async runCleaningOverdueJob() {
    return this.jobsService.cleaningOverdueJob();
  }
}
