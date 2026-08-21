import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateExportDto {
  @IsString()
  @IsNotEmpty()
  periodStart: string;

  @IsString()
  @IsNotEmpty()
  periodEnd: string;
}
