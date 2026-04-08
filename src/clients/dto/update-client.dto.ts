import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateClientDto {
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
  @Min(0)
  todayTaskCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  workPhase?: number;
}
