import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCorrectiveActionDto {
  @IsString()
  @IsNotEmpty()
  actionText: string;
}
