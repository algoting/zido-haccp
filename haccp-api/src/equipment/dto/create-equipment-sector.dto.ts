import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateEquipmentSectorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
