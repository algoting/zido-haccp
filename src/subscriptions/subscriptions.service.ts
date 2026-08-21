import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateSubscription(establishmentId: string) {
    let subscription = await this.prisma.subscription.findUnique({
      where: { establishmentId },
    });

    if (!subscription) {
      // Create subscription with PAST_DUE — user must pay to activate
      subscription = await this.prisma.subscription.create({
        data: {
          establishmentId,
          status: SubscriptionStatus.PAST_DUE,
          currentPeriodEnd: new Date(), // no active period
        },
      });
    }

    return subscription;
  }

  async getSubscription(establishmentId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { establishmentId },
      include: { billingEvents: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });

    if (!subscription) {
      throw new NotFoundException('Abonnement non trouvé');
    }

    return subscription;
  }

  async getByEstablishmentId(establishmentId: string) {
    return this.prisma.subscription.findUnique({
      where: { establishmentId },
      include: { billingEvents: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
  }

  async updateSubscriptionStatus(
    establishmentId: string,
    status: SubscriptionStatus,
  ) {
    return this.prisma.subscription.update({
      where: { establishmentId },
      data: { status },
    });
  }

  async setStripeIds(
    establishmentId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string,
  ) {
    return this.prisma.subscription.update({
      where: { establishmentId },
      data: { stripeCustomerId, stripeSubscriptionId },
    });
  }

  async recordBillingEvent(
    subscriptionId: string,
    type: string,
    stripeEventId?: string,
    amount?: number,
    description?: string,
    metadata?: any,
  ) {
    return this.prisma.billingEvent.create({
      data: {
        subscriptionId,
        type: type as any,
        stripeEventId,
        amount,
        description,
        metadata,
      },
    });
  }

  async getSubscriptionById(id: string) {
    return this.prisma.subscription.findUnique({
      where: { id },
      include: { billingEvents: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async getAllSubscriptions(skip = 0, take = 50) {
    return this.prisma.subscription.findMany({
      skip,
      take,
      include: { establishment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllSubscriptionsCount() {
    return this.prisma.subscription.count();
  }

  async getSubscriptionsByStatus(
    status: SubscriptionStatus,
    skip = 0,
    take = 50,
  ) {
    return this.prisma.subscription.findMany({
      where: { status },
      skip,
      take,
      include: { establishment: true },
      orderBy: { lastPaymentAt: { sort: 'desc', nulls: 'last' } },
    });
  }

  async getRevenueMetrics() {
    // Get all paid invoices from billing events
    const paidEvents = await this.prisma.billingEvent.findMany({
      where: { type: 'INVOICE_PAID' },
    });

    const totalRevenue = paidEvents.reduce(
      (sum, event) => sum + (event.amount || 0),
      0,
    );

    // Get monthly revenue (current month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyPaidEvents = await this.prisma.billingEvent.findMany({
      where: {
        type: 'INVOICE_PAID',
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    });

    const monthlyRevenue = monthlyPaidEvents.reduce(
      (sum, event) => sum + (event.amount || 0),
      0,
    );

    // Get active subscriptions count
    const activeCount = await this.prisma.subscription.count({
      where: { status: SubscriptionStatus.ACTIVE },
    });

    const expectedRevenue = activeCount * 4900; // 49 EUR in cents

    return {
      totalRevenue: totalRevenue / 100,
      monthlyRevenue: monthlyRevenue / 100,
      expectedRevenue: expectedRevenue / 100,
      activeSubscriptions: activeCount,
    };
  }

  async toggleLockStatus(establishmentId: string, lock: boolean) {
    await this.getSubscription(establishmentId);

    const newStatus = lock
      ? SubscriptionStatus.LOCKED_MANUAL
      : SubscriptionStatus.ACTIVE;

    return this.updateSubscriptionStatus(establishmentId, newStatus);
  }
}
