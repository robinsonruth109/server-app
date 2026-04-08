import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateClientDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsOptional()
  @IsNumber()
  balance?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  vipLevel?: number;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @IsOptional()
  @IsBoolean()
  isFrozen?: boolean;

  @IsOptional()
  @IsBoolean()
  taxControl?: boolean;

  @IsOptional()
  @IsBoolean()
  canGrabOrders?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  dailyTaskLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  workPhase?: number;

  @IsOptional()
  @IsString()
  referredByCode?: string;
}
