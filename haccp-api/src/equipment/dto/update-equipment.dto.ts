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
  minTempC?: number | null;

  @IsOptional()
  @IsNumber()
  maxTempC?: number | null;

  @IsOptional()
  @IsString()
  sectorId?: string;
}
