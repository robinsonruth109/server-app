import { IsBoolean } from 'class-validator';

export class UpdateManualModeDto {
  @IsBoolean()
  isManualTaskControl: boolean;
}
