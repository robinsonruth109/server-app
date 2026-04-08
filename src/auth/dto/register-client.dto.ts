import { IsString, MinLength } from 'class-validator';

export class RegisterClientDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsString()
  invitationCode: string;
}