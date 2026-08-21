import { Module } from '@nestjs/common';
import { SopalogService } from './sopalogs.service';
import { SopalogConsumerService } from './sopalogs-consumer.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SopalogService, SopalogConsumerService],
  exports: [SopalogService],
})
export class SopalogModule {}
