import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SubscriptionStatus, SubscriptionPlan } from '@prisma/client';

const PLAN_PRICE_ENV: Record<SubscriptionPlan, string> = {
  CONNECT: 'STRIPE_PRICE_ID_CONNECT',
  PRO_SUIVI: 'STRIPE_PRICE_ID_PRO_SUIVI',
  SERENITE: 'STRIPE_PRICE_ID_SERENITE',
};

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('STRIPE_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'STRIPE_API_KEY not set. Stripe features will be disabled.',
      );
      return;
    }
    this.stripe = new Stripe(apiKey);
  }

  get isEnabled(): boolean {
    return !!this.stripe;
  }

  /**
   * Create a Stripe Checkout Session for an establishment
   * Uses the plan-specific price ID from env
   */
  async createCheckoutSession(
    establishmentId: string,
    userEmail: string,
    successUrl: string,
    cancelUrl: string,
    plan: SubscriptionPlan = SubscriptionPlan.CONNECT,
  ): Promise<{ url: string }> {
    const envKey = PLAN_PRICE_ENV[plan];
    const priceId = this.config.get<string>(envKey) || this.config.get<string>('STRIPE_PRICE_ID');

    const PLAN_AMOUNTS: Record<SubscriptionPlan, number> = {
      CONNECT: 5900,
      PRO_SUIVI: 8900,
      SERENITE: 12900,
    };

    const PLAN_NAMES: Record<SubscriptionPlan, string> = {
      CONNECT: 'CONNECT',
      PRO_SUIVI: 'PRO SUIVI',
      SERENITE: 'SÉRÉNITÉ',
    };

    const lineItems = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: 'eur',
              tax_behavior: 'inclusive',
              product_data: {
                name: `Zido HACCP — Formule ${PLAN_NAMES[plan] || plan}`,
                description: `Abonnement mensuel Zido HACCP (${PLAN_NAMES[plan] || plan})`,
                tax_code: 'txcd_10000000',
              },
              unit_amount: PLAN_AMOUNTS[plan] || 5900,
              recurring: { interval: 'month' as const },
            },
            quantity: 1,
          },
        ];

    // Get or create Stripe customer
    const subscription = await this.prisma.subscription.findUnique({
      where: { establishmentId },
    });

    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: userEmail,
        metadata: { establishmentId },
      });
      customerId = customer.id;

      // Save Stripe customer ID
      if (subscription) {
        await this.prisma.subscription.update({
          where: { establishmentId },
          data: { stripeCustomerId: customerId },
        });
      }
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: lineItems as any,
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: { establishmentId, plan },
      },
      metadata: { establishmentId, plan },
    });

    this.logger.log(
      `Checkout session created for establishment ${establishmentId}`,
    );

    return { url: session.url! };
  }

  /**
   * Create a Stripe Customer Portal session for self-service billing management
   */
  async createCustomerPortalSession(
    establishmentId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { establishmentId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error('No Stripe customer found for this establishment');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    this.logger.log(
      `Customer portal session created for establishment ${establishmentId}`,
    );

    return { url: session.url };
  }

  /**
   * Create a Stripe customer and subscription for an establishment
   */
  async createSubscription(
    establishmentId: string,
    customerId: string,
    priceId: string,
  ) {
    try {
      // Create Stripe subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        metadata: {
          establishmentId,
        },
      });

      // Store provider_id in our database
      await this.prisma.subscription.update({
        where: { establishmentId },
        data: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
        },
      });

      this.logger.log(
        `Stripe subscription created for establishment ${establishmentId}`,
      );
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to create Stripe subscription: ${error}`);
      throw error;
    }
  }

  /**
   * Cancel a Stripe subscription
   */
  async cancelSubscription(stripeSubscriptionId: string) {
    try {
      await (this.stripe.subscriptions.cancel as any)(stripeSubscriptionId);
      this.logger.log(`Stripe subscription ${stripeSubscriptionId} cancelled`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to cancel Stripe subscription: ${error}`);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook - checkout.session.completed
   * This fires when a customer completes Stripe Checkout payment.
   * Activates their subscription and stores Stripe IDs.
   */
  async handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const establishmentId = session.metadata?.establishmentId;

    if (!establishmentId) {
      this.logger.warn('Checkout session completed missing establishmentId');
      return;
    }

    try {
      const stripeSubscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as any)?.id;

      const stripeCustomerId =
        typeof session.customer === 'string'
          ? session.customer
          : (session.customer as any)?.id;

      // Determine plan from metadata
      const plan = (session.metadata?.plan as SubscriptionPlan) || SubscriptionPlan.CONNECT;

      // Activate the subscription
      await this.prisma.subscription.update({
        where: { establishmentId },
        data: {
          plan,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: stripeCustomerId || undefined,
          stripeSubscriptionId: stripeSubscriptionId || undefined,
          lastPaymentAt: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days (will be updated by subscription.updated webhook)
        },
      });

      // Record billing event
      const sub = await this.prisma.subscription.findUnique({
        where: { establishmentId },
      });

      if (sub) {
        await this.prisma.billingEvent.create({
          data: {
            subscriptionId: sub.id,
            type: 'SUBSCRIPTION_CREATED',
            amount: session.amount_total ? session.amount_total / 100 : 4900,
            currency: (session.currency || 'eur').toUpperCase(),
            metadata: {
              stripeSessionId: session.id,
              stripeEventId: event.id,
            },
          },
        });
      }

      this.logger.log(
        `Checkout completed — subscription activated for establishment ${establishmentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle checkout.session.completed: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Handle Stripe webhook - invoice.paid event
   */
  async handleInvoicePaid(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const establishmentId = invoice.metadata?.establishmentId as string;

    if (!establishmentId) {
      this.logger.warn('Invoice paid event missing establishmentId');
      return;
    }

    try {
      // Update subscription status to ACTIVE
      await this.prisma.subscription.update({
        where: { establishmentId },
        data: {
          status: SubscriptionStatus.ACTIVE,
        },
      });

      // Create billing event record
      await this.prisma.billingEvent.create({
        data: {
          subscriptionId: (await this.prisma.subscription.findUnique({
            where: { establishmentId },
          }))!.id,
          type: 'INVOICE_PAID',
          amount: invoice.amount_paid / 100, // Stripe uses cents
          currency: invoice.currency?.toUpperCase() || 'EUR',
          metadata: {
            stripeInvoiceId: invoice.id,
            stripeEventId: event.id,
          },
        },
      });

      this.logger.log(`Invoice paid for establishment ${establishmentId}`);
    } catch (error) {
      this.logger.error(`Failed to handle invoice.paid webhook: ${error}`);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook - invoice.payment_failed event
   */
  async handleInvoicePaymentFailed(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const establishmentId = invoice.metadata?.establishmentId as string;

    if (!establishmentId) {
      this.logger.warn('Invoice payment failed event missing establishmentId');
      return;
    }

    try {
      // Update subscription status to PAST_DUE
      await this.prisma.subscription.update({
        where: { establishmentId },
        data: {
          status: SubscriptionStatus.PAST_DUE,
        },
      });

      // Create billing event record
      await this.prisma.billingEvent.create({
        data: {
          subscriptionId: (await this.prisma.subscription.findUnique({
            where: { establishmentId },
          }))!.id,
          type: 'INVOICE_FAILED',
          amount: invoice.amount_due ? invoice.amount_due / 100 : 0,
          currency: invoice.currency?.toUpperCase() || 'EUR',
          metadata: {
            stripeInvoiceId: invoice.id,
            stripeEventId: event.id,
            failureReason:
              invoice.last_finalization_error?.message || 'Unknown',
          },
        },
      });

      this.logger.log(
        `Invoice payment failed for establishment ${establishmentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle invoice.payment_failed webhook: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Handle Stripe webhook - customer.subscription.deleted event
   */
  async handleSubscriptionDeleted(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    const establishmentId = subscription.metadata?.establishmentId;

    if (!establishmentId) {
      this.logger.warn('Subscription deleted event missing establishmentId');
      return;
    }

    try {
      // Update subscription status to CANCELED
      await this.prisma.subscription.update({
        where: { establishmentId },
        data: {
          status: SubscriptionStatus.CANCELED,
        },
      });

      // Create billing event record
      await this.prisma.billingEvent.create({
        data: {
          subscriptionId: (await this.prisma.subscription.findUnique({
            where: { establishmentId },
          }))!.id,
          type: 'SUBSCRIPTION_CANCELED',
          amount: 0,
          currency: 'EUR',
          metadata: {
            stripeSubscriptionId: subscription.id,
            stripeEventId: event.id,
            cancelReason:
              subscription.cancellation_details?.reason || 'Unknown',
          },
        },
      });

      this.logger.log(
        `Subscription deleted for establishment ${establishmentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle customer.subscription.deleted webhook: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Handle Stripe webhook - customer.subscription.updated event
   */
  async handleSubscriptionUpdated(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    const establishmentId = subscription.metadata?.establishmentId;

    if (!establishmentId) {
      this.logger.warn('Subscription updated event missing establishmentId');
      return;
    }

    try {
      // Determine new status based on Stripe subscription status
      let newStatus: SubscriptionStatus = SubscriptionStatus.ACTIVE;

      if (subscription.status === 'past_due') {
        newStatus = SubscriptionStatus.PAST_DUE;
      } else if (
        subscription.status === 'canceled' ||
        subscription.status === 'incomplete_expired'
      ) {
        newStatus = SubscriptionStatus.CANCELED;
      } else if (
        subscription.status === 'active' ||
        subscription.status === 'trialing'
      ) {
        newStatus = SubscriptionStatus.ACTIVE;
      }

      // Update subscription status
      await this.prisma.subscription.update({
        where: { establishmentId },
        data: {
          status: newStatus,
          currentPeriodEnd: (subscription as any).current_period_end
            ? new Date((subscription as any).current_period_end * 1000)
            : undefined,
        },
      });

      this.logger.log(
        `Subscription updated for establishment ${establishmentId} to status ${newStatus}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle customer.subscription.updated webhook: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Verify webhook signature and return event
   */
  verifyWebhookSignature(body: string, signature: string): Stripe.Event {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not set');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret,
      );
      return event;
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error}`);
      throw error;
    }
  }
}
