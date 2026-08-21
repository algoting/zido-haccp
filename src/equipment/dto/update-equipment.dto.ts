import { IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  minTempC?: number;

  @IsOptional()
  @IsNumber()
  maxTempC?: number;

  @IsOptional()
  @IsString()
  sectorId?: string;
}
