import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ConnectBlulogBrokerDto {
  @IsString()
  @IsNotEmpty({ message: 'L\'identifiant bluConsole (login) est requis' })
  login: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe bluConsole est requis' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom de l\'organisation Blulog est requis (ex: Blulog demo)' })
  organization: string;

  @IsOptional()
  @IsString()
  host?: string; // Default: rabbitmq-lb.bluconsole.com

  @IsOptional()
  @IsString()
  vhost?: string; // Default: blu-vhost
}
