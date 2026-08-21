import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateEquipmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumber()
  minTempC: number;

  @IsNumber()
  maxTempC: number;

  @IsOptional()
  @IsString()
  sectorId?: string;
}
