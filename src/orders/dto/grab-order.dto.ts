import { IsInt, IsString, Min } from 'class-validator';

export class GrabOrderDto {
  @IsInt()
  @Min(1)
  clientId: number;

  @IsString()
  platform: string;
}
