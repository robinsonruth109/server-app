import { IsString, MinLength } from 'class-validator';

export class SetWithdrawalPasswordDto {
  @IsString()
  @MinLength(4)
  password: string;
}
