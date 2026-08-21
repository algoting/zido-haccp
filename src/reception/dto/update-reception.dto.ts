import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { ReceptionCategoryDto } from './create-reception.dto';

export class UpdateReceptionDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsEnum(ReceptionCategoryDto)
  category?: ReceptionCategoryDto;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsBoolean()
  packagingOk?: boolean;
}
