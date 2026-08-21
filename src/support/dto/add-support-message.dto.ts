import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AddSupportMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
