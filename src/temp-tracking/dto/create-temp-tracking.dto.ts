import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTempTrackingDto {
  @IsString()
  @IsNotEmpty()
  action: string; // CUISSON, REFROIDISSEMENT, RECHAUFFAGE, MAINTIEN_CHAUD, SURGELATION

  @IsOptional()
  @IsString()
  productName?: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsNotEmpty()
  startTemp: number | string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  endTemp?: number | string;
}
