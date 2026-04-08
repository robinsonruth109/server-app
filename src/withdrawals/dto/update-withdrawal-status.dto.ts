import { IsIn, IsString } from 'class-validator';

export class UpdateWithdrawalStatusDto {
  @IsString()
  @IsIn(['pending', 'approved', 'rejected', 'paid'])
  status: 'pending' | 'approved' | 'rejected' | 'paid';
}
