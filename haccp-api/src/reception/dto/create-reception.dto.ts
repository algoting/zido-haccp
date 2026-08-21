import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';

export enum ReceptionCategoryDto {
  FRAIS = 'FRAIS',
  SEC = 'SEC',
  SURGELE = 'SURGELE',
}

export class CreateReceptionDto {
  @IsString()
  supplierId: string;

  @IsEnum(ReceptionCategoryDto)
  category: ReceptionCategoryDto;

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
