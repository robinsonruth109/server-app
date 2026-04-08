import { IsString } from 'class-validator';

export class UpdateClientAvatarDto {
  @IsString()
  avatarUrl: string;
}