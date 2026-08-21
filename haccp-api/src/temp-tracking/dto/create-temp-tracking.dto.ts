import { IsString, IsNumber, IsOptional, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

const VALID_ACTIONS = ['CUISSON', 'REFROIDISSEMENT', 'MAINTIEN_CHAUD', 'SURGELATION'] as const;

export class CreateTempTrackingDto {
  @IsIn(VALID_ACTIONS)
  action: typeof VALID_ACTIONS[number];

  @IsString()
  @IsOptional()
  productName?: string;

  @IsDateString()
  startTime: string;

  @Type(() => Number)
  @IsNumber()
  startTemp: number;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  endTemp?: number;
}
