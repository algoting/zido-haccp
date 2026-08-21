import { IsString, IsOptional, IsEnum } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

export class UpdateSubscriptionStatusDto {
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
