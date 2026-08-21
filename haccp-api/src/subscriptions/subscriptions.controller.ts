import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  @Get('/current')
  @UseGuards(JwtAuthGuard)
  async getCurrentSubscription(@Request() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user?.establishmentId) {
      throw new BadRequestException('No establishment found');
    }

    const subscription = await this.subscriptionsService.getOrCreateSubscription(
      user.establishmentId,
    );

    return subscription;
  }

  @Get('/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN', 'OWNER')
  async getSubscription(@Param('id') id: string, @Request() req: any) {
    const subscription =
      await this.subscriptionsService.getSubscriptionById(id);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    // Owners can only see their own subscription
    if (req.user.role === 'OWNER') {
      if (subscription.establishmentId !== req.user.establishmentId) {
        throw new ForbiddenException('Forbidden');
      }
    }
    return subscription;
  }

  @Post('/:id/reconcile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  async reconcileSubscription(
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    const subscription =
      await this.subscriptionsService.getSubscriptionById(id);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    // In MVP, just verify status; Stripe integration will come later
    const currentDate = new Date();
    let newStatus = subscription.status;
    if (
      currentDate > subscription.currentPeriodEnd &&
      subscription.status === SubscriptionStatus.ACTIVE
    ) {
      newStatus = SubscriptionStatus.PAST_DUE;
    }
    const updated = await this.subscriptionsService.updateSubscriptionStatus(
      subscription.establishmentId,
      newStatus,
    );
    // Audit log
    if (body.notes) {
      await this.auditService.logAction(
        subscription.establishmentId,
        'SUBSCRIPTION_STATUS_CHANGED',
        'Subscription',
        subscription.id,
        subscription,
        updated,
      );
    }
    return updated;
  }
}
