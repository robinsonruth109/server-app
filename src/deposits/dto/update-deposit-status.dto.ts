import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDepositStatusDto {
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'])
  status: 'pending' | 'approved' | 'rejected';

  @IsOptional()
  @IsNumber()
  @Min(0)
  confirmationAmount?: number;
}
