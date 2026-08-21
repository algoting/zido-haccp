import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PmsService } from './pms.service';
import { PmsController } from './pms.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { GcsService } from '../exports/gcs.service';
import { LocalFileService } from '../exports/local-file.service';

@Module({
  imports: [PrismaModule, AuditModule, SubscriptionsModule, ConfigModule],
  controllers: [PmsController],
  providers: [PmsService, GcsService, LocalFileService],
  exports: [PmsService],
})
export class PmsModule {}
