import { SetMetadata } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';

export const MIN_PLAN_KEY = 'minPlan';
export const RequirePlan = (plan: SubscriptionPlan) => SetMetadata(MIN_PLAN_KEY, plan);
