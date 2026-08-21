import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateSectorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
