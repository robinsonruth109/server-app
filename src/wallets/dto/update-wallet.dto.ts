import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateWalletDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  network?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
