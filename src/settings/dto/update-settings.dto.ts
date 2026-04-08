import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  dailyTaskLimit?: number;

  @IsOptional()
  @IsNumber()
  vip1MinBalance?: number;

  @IsOptional()
  @IsNumber()
  vip1MaxBalance?: number;

  @IsOptional()
  @IsNumber()
  vip2MinBalance?: number;

  @IsOptional()
  @IsNumber()
  vip2MaxBalance?: number;

  @IsOptional()
  @IsNumber()
  vip3MinBalance?: number;

  @IsOptional()
  @IsNumber()
  vip1Commission?: number;

  @IsOptional()
  @IsNumber()
  vip2Commission?: number;

  @IsOptional()
  @IsNumber()
  vip3Commission?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  phase1ComboCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  phase2ComboCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  phase3ComboCount?: number;

  @IsOptional()
  @IsNumber()
  minDeposit?: number;

  @IsOptional()
  @IsNumber()
  minWithdrawal?: number;

  @IsOptional()
  @IsNumber()
  withdrawalFeeRate?: number;

  @IsOptional()
  @IsString()
  taxControlMessage?: string;

  @IsOptional()
  @IsString()
  phase1ComboPositions?: string;

  @IsOptional()
  @IsString()
  phase2ComboPositions?: string;

  @IsOptional()
  @IsString()
  phase3ComboPositions?: string;

  @IsOptional()
  @IsNumber()
  comboExtraAmount?: number;

  @IsOptional()
  @IsNumber()
  normalOrderRatio?: number;

  @IsOptional()
  @IsString()
  telegramGroupLink?: string;
}
