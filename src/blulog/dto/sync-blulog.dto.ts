import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class SyncBlulogRestDto {
  @IsString()
  @IsNotEmpty({ message: 'Le jeton d\'accès X-Access-Token Blulog est requis' })
  accessToken: string;

  @IsOptional()
  @IsBoolean()
  autoCreateEquipment?: boolean;
}

export class SyncBlulogBluApiDto {
  @IsString()
  @IsNotEmpty({ message: 'L\'identifiant Blulog (uname) est requis' })
  uname: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe Blulog (upass) est requis' })
  upass: string;

  @IsOptional()
  @IsString()
  serverVersion?: 'BC1.0' | 'BC2.0';

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  hubIds?: string;

  @IsOptional()
  @IsString()
  hubVrns?: string;

  @IsOptional()
  @IsNumber()
  fromTime?: number;

  @IsOptional()
  @IsNumber()
  toTime?: number;

  @IsOptional()
  @IsBoolean()
  recordings?: boolean;

  @IsOptional()
  @IsNumber()
  ver?: number;

  @IsOptional()
  @IsBoolean()
  children?: boolean;

  @IsOptional()
  @IsBoolean()
  includeAll?: boolean;

  @IsOptional()
  @IsBoolean()
  autoCreateEquipment?: boolean;
}
