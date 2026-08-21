import { IsString, IsOptional } from 'class-validator';

export class UpdateTempTrackingDto {
  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  endTemp?: number | string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
