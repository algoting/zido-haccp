import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';

export class RecordOilCheckDto {
  @IsString()
  @IsNotEmpty()
  stationId: string;

  @IsOptional()
  @IsEnum(['GOOD', 'BAD'])
  quality?: 'GOOD' | 'BAD';

  @IsOptional()
  @IsNumber()
  polarity?: number;

  @IsOptional()
  @IsBoolean()
  oilChanged?: boolean;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
