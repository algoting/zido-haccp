import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateEquipmentDto {
  @IsString()
  @IsNotEmpty()
  sectorId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
