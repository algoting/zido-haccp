import { IsString, IsNumber, IsDateString, IsPositive, MinLength, IsOptional } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2, { message: 'Product name must be at least 2 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  supplier?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  quantityUnit?: string; // kg, L, pieces, boxes, etc.

  @IsOptional()
  @IsString()
  @MinLength(1)
  storageLocation?: string;

  @IsOptional()
  @IsString()
  classification?: string;
}
