import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.systemSetting.findFirst({
      orderBy: { id: 'asc' },
    });

    if (!settings) {
      settings = await this.prisma.systemSetting.create({
        data: {
          // ✅ ensure defaults exist
          telegramGroupLink: '',
        },
      });
    }

    return settings;
  }

  async updateSettings(updateSettingsDto: UpdateSettingsDto) {
    let settings = await this.prisma.systemSetting.findFirst({
      orderBy: { id: 'asc' },
    });

    if (!settings) {
      settings = await this.prisma.systemSetting.create({
        data: {
          telegramGroupLink: '',
        },
      });
    }

    return this.prisma.systemSetting.update({
      where: { id: settings.id },
      data: updateSettingsDto,
    });
  }
}
