import { IsInt, IsNumber, IsString, Min } from 'class-validator';

export class CreateWithdrawalDto {
  @IsInt()
  clientId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNumber()
  @Min(0)
  fee: number;

  @IsString()
  password: string;
}
