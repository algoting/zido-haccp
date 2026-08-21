import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PushNotificationsService } from '../notifications/push-notifications.service';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [JobsController],
  providers: [JobsService, PushNotificationsService],
  exports: [JobsService],
})
export class JobsModule {}
