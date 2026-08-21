import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { SubscriptionStatus, SubscriptionPlan } from '@prisma/client';

export class UpdateSubscriptionStatusDto {
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @IsOptional()
  @IsNumber()
  durationDays?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

