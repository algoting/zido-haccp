import { IsString, IsNumber, IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateTemperatureLogDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  equipmentId: string;

  @IsNumber()
  temperatureC: number;

  // ISO string like "2026-01-30T12:00:00.000Z"
  @IsDateString()
  measuredAt: string;
}
