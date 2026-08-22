import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { MIN_PLAN_KEY } from './plan.decorator';

const PLAN_LEVELS: Record<SubscriptionPlan, number> = {
  CONNECT: 1,
  PRO_SUIVI: 2,
  SERENITE: 3,
};

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<SubscriptionPlan>(
      MIN_PLAN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPlan) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Platform admins bypass all plan restrictions
    if (!user || user.role === 'PLATFORM_ADMIN' || !user.establishmentId) {
      return true;
    }

    const subscription = await this.subscriptionsService.getSubscription(
      user.establishmentId,
    );

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new ForbiddenException(
        'Abonnement inactif. Veuillez souscrire pour accéder à cette fonctionnalité.',
      );
    }

    const userPlanLevel = PLAN_LEVELS[subscription.plan] || 1;
    const requiredPlanLevel = PLAN_LEVELS[requiredPlan] || 1;

    if (userPlanLevel < requiredPlanLevel) {
      const planName = requiredPlan === 'SERENITE' ? 'SÉRÉNITÉ (129€/m)' : 'PRO SUIVI (89€/m)';
      throw new ForbiddenException(
        `Cette fonctionnalité est réservée au forfait ${planName}. Mettez à niveau votre abonnement pour y accéder.`,
      );
    }

    return true;
  }
}
