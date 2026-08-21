import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateBatchDto {
  @IsString()
  @IsNotEmpty()
  internalPreparationId: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsDateString()
  productionDateTime: string;
}
