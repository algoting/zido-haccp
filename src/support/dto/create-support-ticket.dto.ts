import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export class CreateSupportTicketDto {
  @IsEnum(['PAYMENT', 'CONFIGURATION', 'BUG', 'OTHER'])
  category: 'PAYMENT' | 'CONFIGURATION' | 'BUG' | 'OTHER';

  @IsString()
  @IsNotEmpty()
  message: string;
}
