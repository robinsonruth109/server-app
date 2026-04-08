import { IsInt, Min } from 'class-validator';

export class SubmitOrderDto {
  @IsInt()
  @Min(1)
  clientId: number;

  @IsInt()
  @Min(1)
  orderId: number;
}
