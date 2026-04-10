import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { SetWithdrawalPasswordDto } from './dto/set-withdrawal-password.dto';
import { SaveClientWalletDto } from './dto/save-client-wallet.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= ADMIN COMPANY WALLETS =================

  async create(createWalletDto: CreateWalletDto) {
    const existing = await this.prisma.companyWallet.findUnique({
      where: { address: createWalletDto.address },
    });

    if (existing) {
      throw new BadRequestException('Wallet address already exists');
    }

    return this.prisma.companyWallet.create({
      data: {
        name: createWalletDto.name,
        address: createWalletDto.address,
        currency: createWalletDto.currency,
        network: createWalletDto.network,
        isActive: createWalletDto.isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.companyWallet.findMany({
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const wallet = await this.prisma.companyWallet.findUnique({
      where: { id },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    return wallet;
  }

  async update(id: number, updateWalletDto: UpdateWalletDto) {
    const wallet = await this.prisma.companyWallet.findUnique({
      where: { id },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    if (updateWalletDto.address && updateWalletDto.address !== wallet.address) {
      const existing = await this.prisma.companyWallet.findUnique({
        where: { address: updateWalletDto.address },
      });

      if (existing) {
        throw new BadRequestException('Wallet address already exists');
      }
    }

    return this.prisma.companyWallet.update({
      where: { id },
      data: {
        ...updateWalletDto,
      },
    });
  }

  async remove(id: number) {
    const wallet = await this.prisma.companyWallet.findUnique({
      where: { id },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    await this.prisma.companyWallet.delete({
      where: { id },
    });

    return {
      message: 'Wallet deleted successfully',
    };
  }

  async getRandomActiveWallet() {
    const wallets = await this.prisma.companyWallet.findMany({
      where: { isActive: true },
    });

    if (!wallets.length) {
      throw new BadRequestException('No active company wallet available');
    }

    const randomIndex = Math.floor(Math.random() * wallets.length);
    return wallets[randomIndex];
  }

  // ================= CLIENT WITHDRAW WALLET =================

  async getClientWallet(clientId: number) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        withdrawWalletAddress: true,
        withdrawWalletNetwork: true,
        withdrawWalletName: true,
        withdrawalPassword: true,
      },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    return {
      hasPassword: !!client.withdrawalPassword,
      wallet: client.withdrawWalletAddress
        ? {
            address: client.withdrawWalletAddress,
            network: client.withdrawWalletNetwork,
            walletName: client.withdrawWalletName,
          }
        : null,
    };
  }

  async setWithdrawalPassword(
    clientId: number,
    dto: SetWithdrawalPasswordDto,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    if (client.withdrawalPassword) {
      throw new BadRequestException('Withdrawal password already set');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        withdrawalPassword: hashedPassword,
      },
    });

    return {
      message: 'Withdrawal password set successfully',
    };
  }

  async saveClientWallet(clientId: number, dto: SaveClientWalletDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    if (!client.withdrawalPassword) {
      throw new BadRequestException('Please set withdrawal password first');
    }

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        withdrawWalletAddress: dto.address,
        withdrawWalletNetwork: dto.network,
        withdrawWalletName: dto.walletName,
      },
      select: {
        id: true,
        withdrawWalletAddress: true,
        withdrawWalletNetwork: true,
        withdrawWalletName: true,
      },
    });

    return {
      message: 'Wallet saved successfully',
      wallet: {
        address: updated.withdrawWalletAddress,
        network: updated.withdrawWalletNetwork,
        walletName: updated.withdrawWalletName,
      },
    };
  }
}
