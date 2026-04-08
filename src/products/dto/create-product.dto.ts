import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  imageUrl: string;

  @IsNumber()
  @Min(0.01)
  price: number;

  @IsString()
  platform: string;

  @IsInt()
  @Min(1)
  vipLevel: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
