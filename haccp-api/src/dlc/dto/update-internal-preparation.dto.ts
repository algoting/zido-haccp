import { IsString, IsOptional, IsNotEmpty, IsInt, Min } from 'class-validator';

export class UpdateInternalPreparationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  shelfLifeDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  shelfLifeHours?: number;
}
