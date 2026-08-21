import { IsString, IsOptional } from 'class-validator';

export class DevActivateDto {
  @IsOptional()
  @IsString()
  plan?: string;
}
