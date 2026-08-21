import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { SubscriptionStatus } from '@prisma/client';

/**
 * Guard to enforce subscription state:
 * - ACTIVE: allow all operations
 * - Any other status: block ALL requests (reads + writes)
 *
 * Apply at class level with @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
 * Platform admins (no establishmentId) bypass this guard.
 */
@Injectable()
export class SubscriptionStateGuard implements CanActivate {
  constructor(private subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Platform admins have no establishmentId — bypass subscription check
    if (!user || !user.establishmentId) {
      return true;
    }

    try {
      const subscription = await this.subscriptionsService.getSubscription(
        user.establishmentId,
      );

      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        throw new ForbiddenException(
          'Abonnement inactif. Veuillez souscrire pour accéder à l\'application.',
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // Subscription not found — block access
      throw new ForbiddenException(
        'Abonnement introuvable. Veuillez souscrire pour accéder à l\'application.',
      );
    }
  }
}
