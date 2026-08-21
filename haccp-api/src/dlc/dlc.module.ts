import { Module } from '@nestjs/common';
import { DlcController } from './dlc.controller';
import { DlcService } from './dlc.service';
import { LabelService } from './label.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AuditModule } from '../audit/audit.module';
import { ExportsModule } from '../exports/exports.module';

@Module({
  imports: [PrismaModule, SubscriptionsModule, AuditModule, ExportsModule],
  controllers: [DlcController],
  providers: [DlcService, LabelService],
  exports: [DlcService, LabelService],
})
export class DlcModule {}
