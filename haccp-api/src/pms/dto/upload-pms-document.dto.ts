import { IsString, IsOptional } from 'class-validator';

export class UploadPmsDocumentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
