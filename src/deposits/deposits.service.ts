import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { UpdateDepositStatusDto } from './dto/update-deposit-status.dto';
import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class DepositsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletsService: WalletsService,
  ) {}

  async create(createDepositDto: CreateDepositDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: createDepositDto.clientId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    const wallet = await this.walletsService.getRandomActiveWallet();

    return this.prisma.deposit.create({
      data: {
        clientId: createDepositDto.clientId,
        amount: createDepositDto.amount,
        confirmationAmount: null,
        status: 'pending',
        walletName: wallet.name,
        walletAddress: wallet.address,
        currency: wallet.currency,
        network: wallet.network,
      },
    });
  }

  async findAll() {
    return this.prisma.deposit.findMany({
      orderBy: { id: 'desc' },
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

  async updateStatus(id: number, dto: UpdateDepositStatusDto) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id },
    });

    if (!deposit) {
      throw new BadRequestException('Deposit not found');
    }

    if (deposit.status === 'approved') {
      throw new BadRequestException('Deposit already approved');
    }

    if (dto.status === 'approved') {
      if (
        dto.confirmationAmount === undefined ||
        dto.confirmationAmount === null ||
        Number.isNaN(Number(dto.confirmationAmount))
      ) {
        throw new BadRequestException('Confirmation amount is required');
      }

      const confirmationAmount = Number(dto.confirmationAmount);

      if (confirmationAmount < 0) {
        throw new BadRequestException(
          'Confirmation amount must be greater than or equal to 0',
        );
      }

      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.deposit.update({
          where: { id },
          data: {
            status: 'approved',
            confirmationAmount,
          },
        });

        await tx.client.update({
          where: { id: deposit.clientId },
          data: {
            balance: {
              increment: confirmationAmount,
            },
          },
        });

        return updated;
      });
    }

    return this.prisma.deposit.update({
      where: { id },
      data: {
        status: dto.status,
      },
    });
  }
}
