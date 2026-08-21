import { IsNumber, IsOptional } from 'class-validator';

export class CloseIncidentDto {
  @IsOptional()
  @IsNumber()
  correctiveTemperatureC?: number;
}
