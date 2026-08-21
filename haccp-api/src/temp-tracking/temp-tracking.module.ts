import { Module } from '@nestjs/common';
import { TempTrackingController } from './temp-tracking.controller';
import { TempTrackingService } from './temp-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ExportsModule } from '../exports/exports.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, ExportsModule, SubscriptionsModule],
  controllers: [TempTrackingController],
  providers: [TempTrackingService],
})
export class TempTrackingModule {}
