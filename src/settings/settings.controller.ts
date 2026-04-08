import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // 🔓 PUBLIC (for client app)
  @Get('public')
  getPublicSettings() {
    return this.settingsService.getSettings();
  }

  // 🔐 ADMIN ONLY
  @UseGuards(JwtAuthGuard)
  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  // 🔐 ADMIN ONLY
  @UseGuards(JwtAuthGuard)
  @Patch()
  updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(updateSettingsDto);
  }
}
