import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsEnum } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(['DAILY', 'WEEKLY'])
  frequency?: 'DAILY' | 'WEEKLY';

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
