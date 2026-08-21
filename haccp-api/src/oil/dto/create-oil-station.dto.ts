import { IsString, IsNotEmpty } from 'class-validator';

export class CreateOilStationDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
