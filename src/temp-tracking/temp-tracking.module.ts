import { Module } from '@nestjs/common';
import { TempTrackingService } from './temp-tracking.service';
import { TempTrackingController } from './temp-tracking.controller';
import { AuditModule } from '../audit/audit.module';
import { ExportsModule } from '../exports/exports.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [AuditModule, ExportsModule, SubscriptionsModule],
  controllers: [TempTrackingController],
  providers: [TempTrackingService],
  exports: [TempTrackingService],
})
export class TempTrackingModule {}
