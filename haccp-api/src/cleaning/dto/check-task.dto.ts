import { IsString, IsNotEmpty } from 'class-validator';

export class CheckTaskDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;
}
