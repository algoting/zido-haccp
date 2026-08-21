import { IsString, IsOptional } from 'class-validator';

export class CreateCustomerPortalDto {
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
