import { Module } from '@nestjs/common';
import { BlulogController } from './blulog.controller';
import { BlulogService } from './blulog.service';
import { BlulogBrokerService } from './blulog-broker.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [BlulogController],
  providers: [BlulogService, BlulogBrokerService],
  exports: [BlulogService, BlulogBrokerService],
})
export class BlulogModule {}
