import { IsString, IsOptional } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;

  @IsOptional()
  @IsString()
  plan?: string;
}
