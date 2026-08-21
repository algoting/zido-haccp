import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreateInternalPreparationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsInt()
  @Min(0)
  shelfLifeDays: number;

  @IsInt()
  @Min(0)
  shelfLifeHours: number;
}
