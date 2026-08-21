import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus, SubscriptionPlan, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all subscriptions with pagination
   */
  async getAllSubscriptions(skip = 0, take = 50) {
    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        skip,
        take,
        include: { establishment: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.count(),
    ]);

    return { subscriptions, total, skip, take };
  }

  /**
   * Update subscription status and plan (ACTIVE, PAST_DUE, CANCELED, LOCKED_MANUAL / CONNECT, PRO_SUIVI, SERENITE)
   */
  async updateSubscriptionStatus(
    subscriptionId: string,
    status?: SubscriptionStatus,
    plan?: SubscriptionPlan,
    durationDays?: number,
    notes?: string,
  ) {
    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'CANCELED') {
        updateData.currentPeriodEnd = new Date();
      } else if (status === 'ACTIVE' && (!durationDays || durationDays <= 0)) {
        const current = await this.prisma.subscription.findUnique({
          where: { id: subscriptionId },
          select: { currentPeriodEnd: true, status: true },
        });
        const now = new Date();
        if (
          !current?.currentPeriodEnd ||
          new Date(current.currentPeriodEnd) <= now ||
          current.status === 'CANCELED'
        ) {
          updateData.currentPeriodEnd = new Date(now.getTime() + 30 * 86400000);
        }
      }
    }
    if (plan) updateData.plan = plan;
    if (durationDays && durationDays > 0) {
      const current = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        select: { currentPeriodEnd: true },
      });
      const now = new Date();
      const baseDate =
        current?.currentPeriodEnd && new Date(current.currentPeriodEnd) > now
          ? new Date(current.currentPeriodEnd)
          : now;
      updateData.currentPeriodEnd = new Date(
        baseDate.getTime() + durationDays * 86400000,
      );
    }

    const subscription = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
      include: { establishment: true },
    });

    if (notes || status || plan) {
      await this.prisma.billingEvent.create({
        data: {
          subscriptionId,
          type: status === 'CANCELED' ? 'SUBSCRIPTION_CANCELED' : 'SUBSCRIPTION_UPDATED',
          description: `Abonnement mis à jour (Plan: ${subscription.plan}, Statut: ${subscription.status}). ${notes ? 'Notes: ' + notes : ''}`,
        },
      });
    }

    return subscription;
  }


  /**
   * Get all establishment owners
   */
  async getAllOwners(skip = 0, take = 50) {
    const [owners, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'OWNER' },
        skip,
        take,
        include: { establishment: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { role: 'OWNER' } }),
    ]);

    return { owners, total, skip, take };
  }

  /**
   * Get establishment details by ID
   */
  async getEstablishmentById(establishmentId: string) {
    return this.prisma.establishment.findUnique({
      where: { id: establishmentId },
      include: {
        owner: {
          select: { id: true, email: true },
        },
        subscription: true,
      },
    });
  }

  /**
   * Get all establishments with pagination
   */
  async getAllEstablishments(skip = 0, take = 50) {
    const [establishments, total] = await Promise.all([
      this.prisma.establishment.findMany({
        skip,
        take,
        include: {
          owner: { select: { email: true } },
          subscription: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.establishment.count(),
    ]);

    return { establishments, total, skip, take };
  }

  /**
   * Get all support tickets
   */
  async getAllSupportTickets(skip = 0, take = 50) {
    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        skip,
        take,
        include: {
          establishment: { select: { name: true } },
          createdBy: { select: { email: true } },
          messages: { take: 1, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supportTicket.count(),
    ]);

    return { tickets, total, skip, take };
  }

  /**
   * Get support ticket by ID with all messages
   */
  async getSupportTicketById(ticketId: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        establishment: { select: { name: true } },
        createdBy: { select: { email: true } },
        messages: {
          include: { sender: { select: { email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Get all users for admin filters
   */
  async getAllUsers(skip = 0, take = 100) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        select: { id: true, email: true, displayName: true, role: true, suspended: true, establishmentId: true },
        orderBy: { email: 'asc' },
        skip,
        take,
      }),
      this.prisma.user.count(),
    ]);
    return { users, total, skip, take };
  }

  async toggleUserSuspended(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    if (user.role === 'PLATFORM_ADMIN') {
      throw new ConflictException('Impossible de suspendre un administrateur');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { suspended: !user.suspended },
      select: { id: true, email: true, suspended: true },
    });
    return updated;
  }

  /**
   * Get audit logs with pagination
   */
  async getAuditLogs(
    skip = 0,
    take = 50,
    filters?: {
      action?: string;
      entityType?: string;
      userId?: string;
      establishmentId?: string;
    },
  ) {
    const where: any = {};

    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }
    if (filters?.userId) {
      where.actorUserId = filters.userId;
    }
    if (filters?.establishmentId) {
      where.establishmentId = filters.establishmentId;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: {
          establishment: { select: { id: true, name: true } },
          actor: {
            select: { id: true, email: true, displayName: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Map actor to user for frontend compatibility
    const mappedLogs = logs.map((log) => ({
      ...log,
      user: log.actor,
    }));

    return { logs: mappedLogs, total, skip, take };
  }

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics() {
    const metrics = await Promise.all([
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
      this.prisma.subscription.count({ where: { status: 'CANCELED' } }),
      this.prisma.user.count({ where: { role: 'OWNER' } }),
      this.prisma.establishment.count(),
      // Get total revenue from billing events (amount in cents)
      this.prisma.billingEvent.aggregate({
        _sum: { amount: true },
        where: { type: 'INVOICE_PAID' },
      }),
    ]);

    const activeSubscriptions = metrics[0];
    const revenueResult = metrics[5];
    const totalRevenue = revenueResult._sum?.amount || 0;
    // MRR based on active subscriptions (assuming 29.99€/month = 2999 cents)
    const monthlyRecurringRevenue = activeSubscriptions * 2999;

    return {
      activeSubscriptions,
      pastDueSubscriptions: metrics[1],
      canceledSubscriptions: metrics[2],
      totalOwners: metrics[3],
      totalEstablishments: metrics[4],
      totalRevenue,
      monthlyRecurringRevenue,
    };
  }

  /**
   * Get system health/stats
   */
  async getSystemStats() {
    const [
      totalUsers,
      totalEstablishments,
      totalSupport,
      totalIncidents,
      totalTemperatureLogs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.establishment.count(),
      this.prisma.supportTicket.count(),
      this.prisma.incident.count(),
      this.prisma.temperatureLog.count(),
    ]);

    return {
      totalUsers,
      totalEstablishments,
      totalSupportTickets: totalSupport,
      totalIncidents,
      totalTemperatureLogs,
    };
  }

  /**
   * Update support ticket status
   */
  async updateSupportTicketStatus(ticketId: string, status: string) {
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: status as any },
      include: {
        establishment: { select: { name: true } },
        createdBy: { select: { email: true } },
      },
    });
  }

  /**
   * Create an establishment with an owner user and optional active subscription
   */
  async createEstablishment(
    name: string,
    ownerEmail: string,
    ownerPassword: string,
    activateSubscription: boolean,
    durationDays: number = 365,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: ownerEmail },
    });
    if (existing) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const passwordHash = await bcrypt.hash(ownerPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        email: ownerEmail,
        role: 'OWNER',
        passwordHash,
      },
    });

    const establishment = await this.prisma.establishment.create({
      data: {
        name,
        ownerId: user.id,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { establishmentId: establishment.id },
    });

    await this.prisma.subscription.create({
      data: {
        establishmentId: establishment.id,
        status: activateSubscription ? 'ACTIVE' : 'PAST_DUE',
        currentPeriodEnd: activateSubscription
          ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
          : new Date(),
      },
    });

    return {
      establishment: { id: establishment.id, name: establishment.name },
      owner: { id: user.id, email: user.email, role: user.role },
      subscriptionStatus: activateSubscription ? 'ACTIVE' : 'PAST_DUE',
    };
  }

  /**
   * Create a user and link to an existing establishment
   */
  async createUser(
    email: string,
    password: string,
    role: UserRole,
    establishmentId: string,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
    });
    if (!establishment) {
      throw new NotFoundException('Établissement non trouvé');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        role,
        passwordHash,
        establishmentId,
      },
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      establishmentId: user.establishmentId,
    };
  }
}
