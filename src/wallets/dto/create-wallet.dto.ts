import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsString()
  currency: string;

  @IsString()
  network: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}