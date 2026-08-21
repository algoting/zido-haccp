import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateRecipeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  shelfLifeDays?: number | string;

  @IsOptional()
  shelfLifeHours?: number | string;

  @IsNotEmpty()
  quantity: number | string;

  @IsOptional()
  @IsString()
  unit?: string;
}
