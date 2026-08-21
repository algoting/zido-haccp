import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class ConnectSopalogDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  sopalogDeviceId: string;
}

export class DisconnectSopalogDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
