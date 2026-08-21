import { IsNumber, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTempTrackingDto {
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  endTemp?: number;
}
