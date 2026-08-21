import { IsString, MinLength } from 'class-validator';

export class ResetTeamMemberPasswordDto {
  @IsString()
  @MinLength(8)
  newPassword: string;
}
