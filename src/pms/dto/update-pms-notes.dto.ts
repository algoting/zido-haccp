import { IsString, IsNotEmpty } from 'class-validator';

export class UpdatePmsNotesDto {
  @IsString()
  @IsNotEmpty()
  notes: string;
}
