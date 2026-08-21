import { IsString, IsOptional } from 'class-validator';

export class CreateEstablishmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsString()
  ownerId: string;
}
