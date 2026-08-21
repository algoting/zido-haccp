import { Module } from '@nestjs/common';
import { OilService } from './oil.service';
import { OilController } from './oil.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, AuditModule, SubscriptionsModule],
  controllers: [OilController],
  providers: [OilService],
  exports: [OilService],
})
export class OilModule {}
