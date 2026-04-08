import { IsString } from 'class-validator';

export class SaveClientWalletDto {
  @IsString()
  address: string;

  @IsString()
  network: string;

  @IsString()
  walletName: string;
}