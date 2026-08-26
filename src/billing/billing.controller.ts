import type { Request } from 'express';
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateCustomerPortalDto } from './dto/create-customer-portal.dto';
import { DevActivateDto } from './dto/dev-activate.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SkipThrottle } from '@nestjs/throttler';
import { SubscriptionPlan } from '@prisma/client';

@Controller('billing')
export class BillingController {
  constructor(
    private billingService: BillingService,
    private stripeService: StripeService,
    private prisma: PrismaService,
  ) {}

  /**
   * Public Checkout Endpoint for Direct Subscription from Showcase / Tarifs Page
   * POST /billing/public-checkout
   */
  @Post('/public-checkout')
  async publicCheckout(@Body() dto: { email: string; name?: string; establishmentName?: string; plan?: SubscriptionPlan }) {
    if (!dto || !dto.email) {
      throw new BadRequestException('Email obligatoire pour procéder au paiement');
    }

    const validPlans: string[] = Object.values(SubscriptionPlan);
    const plan = validPlans.includes(dto.plan || '')
      ? (dto.plan as SubscriptionPlan)
      : SubscriptionPlan.CONNECT;

    const email = dto.email.toLowerCase().trim();

    // Find or create user and establishment for this checkout
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    let establishmentId = user?.establishmentId;

    if (!user) {
      // Create establishment & user automatically
      const estName = dto.establishmentName?.trim() || `Établissement ${email.split('@')[0]}`;
      const establishment = await this.prisma.establishment.create({
        data: {
          name: estName,
          type: 'RESTAURANT',
        },
      });
      establishmentId = establishment.id;

      // Hash default temporary password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('ZidoHaccp2026!', 10);

      user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName: dto.name?.trim().split(' ')[0] || 'Client',
          lastName: dto.name?.trim().split(' ').slice(1).join(' ') || 'Zido',
          role: 'OWNER',
          establishmentId: establishment.id,
        },
      });
    }

    if (!this.stripeService.isEnabled) {
      return {
        url: `https://zidohaccp.com/login?email=${encodeURIComponent(email)}&activated=true`,
        message: 'Abonnement activé avec succès',
      };
    }

    return this.stripeService.createCheckoutSession(
      establishmentId!,
      email,
      `https://zidohaccp.com/login?status=success&email=${encodeURIComponent(email)}`,
      `https://zidohaccp.com/tarifs?status=canceled`,
      plan,
    );
  }

  /**
   * Create a Stripe Checkout Session for the current user's establishment
   * POST /billing/create-checkout-session
   */
  @Post('/create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Req() req: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user?.establishmentId) {
      throw new BadRequestException('No establishment found for this user');
    }

    const validPlans: string[] = Object.values(SubscriptionPlan);
    const plan = validPlans.includes(dto.plan || '')
      ? (dto.plan as SubscriptionPlan)
      : SubscriptionPlan.SERENITE;

    // If Stripe is not enabled, automatically activate subscription (SKIP SUB / FREE ACCESS MODE)
    if (!this.stripeService.isEnabled) {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 10);

      await this.prisma.subscription.upsert({
        where: { establishmentId: user.establishmentId },
        update: {
          plan,
          status: 'ACTIVE',
          currentPeriodEnd: farFuture,
          lastPaymentAt: new Date(),
        },
        create: {
          establishmentId: user.establishmentId,
          plan,
          status: 'ACTIVE',
          currentPeriodEnd: farFuture,
          lastPaymentAt: new Date(),
        },
      });

      return {
        url: dto.successUrl || `/dashboard?activated=true`,
        success: true,
        message: 'Abonnement activé avec succès',
      };
    }

    // Check if already has an active subscription
    const existingSub = await this.prisma.subscription.findUnique({
      where: { establishmentId: user.establishmentId },
    });

    if (existingSub?.status === 'ACTIVE') {
      throw new BadRequestException('You already have an active subscription');
    }

    return this.stripeService.createCheckoutSession(
      user.establishmentId,
      user.email,
      dto.successUrl || `${req.headers.origin}/settings?tab=subscription&status=success`,
      dto.cancelUrl || `${req.headers.origin}/pricing?status=canceled`,
      plan,
    );
  }

  /**
   * Create a Stripe Customer Portal session for subscription management
   * POST /billing/customer-portal
   */
  @Post('/customer-portal')
  @UseGuards(JwtAuthGuard)
  async createCustomerPortal(
    @Req() req: any,
    @Body() dto: CreateCustomerPortalDto,
  ) {
    if (!this.stripeService.isEnabled) {
      throw new BadRequestException('Stripe is not configured');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user?.establishmentId) {
      throw new BadRequestException('No establishment found for this user');
    }

    return this.stripeService.createCustomerPortalSession(
      user.establishmentId,
      dto.returnUrl || `${req.headers.origin}/settings?tab=subscription`,
    );
  }

  @Get('/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  async getDashboard() {
    return this.billingService.getBillingDashboard();
  }

  /**
   * Check if Stripe is configured (public, no auth needed)
   * GET /billing/status
   */
  @Get('/status')
  async getStatus() {
    return { stripeEnabled: this.stripeService.isEnabled };
  }

  /**
   * DEV ONLY: Activate subscription without Stripe payment.
   * Only works when STRIPE_API_KEY is NOT set (i.e. local dev).
   * POST /billing/dev-activate
   */
  @Post('/dev-activate')
  @UseGuards(JwtAuthGuard)
  async devActivate(@Req() req: any, @Body() dto: DevActivateDto) {
    if (this.stripeService.isEnabled || process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'Dev activation is disabled in production',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user?.establishmentId) {
      throw new BadRequestException('No establishment found for this user');
    }

    const validPlans: string[] = Object.values(SubscriptionPlan);
    const plan = validPlans.includes(dto?.plan || '')
      ? (dto.plan as SubscriptionPlan)
      : SubscriptionPlan.CONNECT;

    // Activate subscription for 30 days
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

    await this.prisma.subscription.upsert({
      where: { establishmentId: user.establishmentId },
      update: {
        plan,
        status: 'ACTIVE',
        currentPeriodEnd,
        lastPaymentAt: new Date(),
      },
      create: {
        establishmentId: user.establishmentId,
        plan,
        status: 'ACTIVE',
        currentPeriodEnd,
        lastPaymentAt: new Date(),
      },
    });

    return { success: true, message: 'Subscription activated (dev mode)', currentPeriodEnd };
  }

  @Get('/failed-payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  async getFailedPayments() {
    return this.billingService.getFailedPayments();
  }

  /**
   * Stripe webhook endpoint
   * Receives raw body + stripe-signature header for verification
   */
  @Post('/webhooks/stripe')
  @SkipThrottle()
  async stripeWebhook(@Req() req: any) {
    const signature = req.get('stripe-signature');

    if (!signature) {
      throw new BadRequestException('En-tête stripe-signature manquant');
    }

    try {
      // Get raw body as string or buffer
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const bodyString =
        typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');

      // Verify signature and get Stripe event
      const event = this.stripeService.verifyWebhookSignature(
        bodyString,
        signature,
      );

      // Handle event
      return this.billingService.handleStripeWebhook(event);
    } catch (error) {
      throw new BadRequestException(
        `Webhook verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
