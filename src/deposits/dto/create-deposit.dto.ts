import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateDepositDto {
  @IsInt()
  clientId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;
}
