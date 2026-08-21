import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateTicketStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;
}
