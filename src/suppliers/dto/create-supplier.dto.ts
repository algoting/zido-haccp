import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @MinLength(2, { message: 'Supplier name must be at least 2 characters' })
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
