import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateEquipmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

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
