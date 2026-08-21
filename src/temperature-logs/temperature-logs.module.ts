import { Module } from '@nestjs/common';
import { TemperatureLogsService } from './temperature-logs.service';
import { TemperatureLogsController } from './temperature-logs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, AuditModule, NotificationsModule, SubscriptionsModule],
  controllers: [TemperatureLogsController],
  providers: [TemperatureLogsService],
})
export class TemperatureLogsModule {}
