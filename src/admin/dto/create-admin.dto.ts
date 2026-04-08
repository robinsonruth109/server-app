import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
