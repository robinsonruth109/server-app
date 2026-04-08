import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class TaskControlRowDto {
  @IsInt()
  @Min(1)
  @Max(25)
  taskNo: number;

  @IsOptional()
  @IsNumber()
  taskAmount?: number | null;

  @IsOptional()
  @IsNumber()
  commission?: number | null;
}

export class SaveTaskControlDto {
  @IsArray()
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => TaskControlRowDto)
  tasks: TaskControlRowDto[];
}
