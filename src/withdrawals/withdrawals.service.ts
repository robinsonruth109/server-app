import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { UpdateWithdrawalStatusDto } from './dto/update-withdrawal-status.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class WithdrawalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async create(createWithdrawalDto: CreateWithdrawalDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: createWithdrawalDto.clientId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    const settings = await this.settingsService.getSettings();

    if (!client.withdrawalPassword) {
      throw new BadRequestException('Withdrawal password is not set');
    }

    const isPasswordValid = await bcrypt.compare(
      createWithdrawalDto.password,
      client.withdrawalPassword,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid withdrawal password');
    }

    if (!client.withdrawWalletAddress) {
      throw new BadRequestException('Please add withdrawal wallet first');
    }

    if (client.taxControl) {
      throw new BadRequestException(settings.taxControlMessage);
    }

    if (client.isFrozen) {
      throw new BadRequestException('Client account is frozen');
    }

    if (client.todayTaskCount < settings.dailyTaskLimit) {
      throw new BadRequestException(
        "you can't withdrawal money before completing 25 order.",
      );
    }

    if (createWithdrawalDto.amount < settings.minWithdrawal) {
      throw new BadRequestException(
        `Minimum withdrawal amount is ${settings.minWithdrawal}`,
      );
    }

    if (client.balance < createWithdrawalDto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    return this.prisma.withdrawal.create({
      data: {
        clientId: createWithdrawalDto.clientId,
        amount: createWithdrawalDto.amount,
        fee: createWithdrawalDto.fee,
        status: 'pending',
      },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            balance: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.withdrawal.findMany({
      orderBy: { id: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            balance: true,
            taxControl: true,
            isFrozen: true,
          },
        },
      },
    });
  }

  async updateStatus(id: number, dto: UpdateWithdrawalStatusDto) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id },
      include: {
        client: true,
      },
    });

    if (!withdrawal) {
      throw new BadRequestException('Withdrawal not found');
    }

    if (withdrawal.status === 'paid') {
      throw new BadRequestException('Withdrawal already paid');
    }

    if (dto.status === 'approved' && withdrawal.status !== 'approved') {
      if (withdrawal.client.balance < withdrawal.amount) {
        throw new BadRequestException('Client balance is insufficient');
      }

      await this.prisma.client.update({
        where: { id: withdrawal.clientId },
        data: {
          balance: {
            decrement: withdrawal.amount,
          },
        },
      });
    }

    if (dto.status === 'rejected' && withdrawal.status === 'approved') {
      await this.prisma.client.update({
        where: { id: withdrawal.clientId },
        data: {
          balance: {
            increment: withdrawal.amount,
          },
        },
      });
    }

    return this.prisma.withdrawal.update({
      where: { id },
      data: {
        status: dto.status,
      },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            balance: true,
          },
        },
      },
    });
  }
}
