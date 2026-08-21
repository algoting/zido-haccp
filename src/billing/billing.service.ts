import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
    private stripe: StripeService,
  ) {}

  async getBillingDashboard() {
    const metrics = await this.subscriptionsService.getRevenueMetrics();

    const subscriptionCounts = await Promise.all([
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
      this.prisma.subscription.count({ where: { status: 'CANCELED' } }),
    ]);

    return {
      ...metrics,
      activeCount: subscriptionCounts[0],
      pastDueCount: subscriptionCounts[1],
      canceledCount: subscriptionCounts[2],
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        return this.stripe.handleCheckoutCompleted(event);

      case 'invoice.paid':
        return this.stripe.handleInvoicePaid(event);

      case 'invoice.payment_failed':
        return this.stripe.handleInvoicePaymentFailed(event);

      case 'customer.subscription.deleted':
        return this.stripe.handleSubscriptionDeleted(event);

      case 'customer.subscription.updated':
        return this.stripe.handleSubscriptionUpdated(event);

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
        return { received: true };
    }
  }

  async getFailedPayments(take = 50) {
    return this.prisma.billingEvent.findMany({
      where: { type: 'INVOICE_FAILED' },
      orderBy: { createdAt: 'desc' },
      take,
      include: { subscription: { include: { establishment: true } } },
    });
  }
}
