import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExportsService } from './exports.service';
import { PdfService } from './pdf.service';
import { GcsService } from './gcs.service';
import { LocalFileService } from './local-file.service';
import { ExportsController } from './exports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule, SubscriptionsModule],
  controllers: [ExportsController],
  providers: [ExportsService, PdfService, GcsService, LocalFileService],
  exports: [ExportsService, PdfService, GcsService, LocalFileService],
})
export class ExportsModule {}
