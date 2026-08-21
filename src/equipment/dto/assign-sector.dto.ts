import { IsString, IsOptional } from 'class-validator';

export class AssignSectorDto {
  @IsOptional()
  @IsString()
  sectorId: string | null;
}
