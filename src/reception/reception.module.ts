import { Module } from '@nestjs/common';
import { ReceptionService } from './reception.service';
import { ReceptionController } from './reception.controller';
import { AuditModule } from '../audit/audit.module';
import { ExportsModule } from '../exports/exports.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [AuditModule, ExportsModule, SubscriptionsModule],
  controllers: [ReceptionController],
  providers: [ReceptionService],
  exports: [ReceptionService],
})
export class ReceptionModule {}
