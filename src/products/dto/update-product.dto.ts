import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  price?: number;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  vipLevel?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
