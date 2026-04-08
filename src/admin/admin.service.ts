import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string) {
    return this.prisma.admin.findUnique({
      where: { username },
    });
  }

  async getDashboard() {
    const [
      totalClients,
      approvedClients,
      frozenClients,
      pendingDeposits,
      pendingWithdrawals,
      balanceAgg,
      topClients,
    ] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.count({
        where: { isApproved: true },
      }),
      this.prisma.client.count({
        where: { isFrozen: true },
      }),
      this.prisma.deposit.count({
        where: { status: 'pending' },
      }),
      this.prisma.withdrawal.count({
        where: { status: 'pending' },
      }),
      this.prisma.client.aggregate({
        _sum: {
          balance: true,
        },
      }),
      this.prisma.client.findMany({
        orderBy: { balance: 'desc' },
        take: 5,
        select: {
          id: true,
          username: true,
          balance: true,
          vipLevel: true,
          isApproved: true,
          isFrozen: true,
        },
      }),
    ]);

    return {
      totalClients,
      approvedClients,
      frozenClients,
      pendingDeposits,
      pendingWithdrawals,
      totalClientBalance: balanceAgg._sum.balance ?? 0,
      topClients,
    };
  }

  async findAll() {
    return this.prisma.admin.findMany({
      orderBy: { id: 'desc' },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async create(dto: CreateAdminDto) {
    const existing = await this.prisma.admin.findUnique({
      where: { username: dto.username },
    });

    if (existing) {
      throw new BadRequestException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.admin.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        role: dto.role,
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(id: number, dto: UpdateAdminDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
    });

    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    if (dto.username && dto.username !== admin.username) {
      const existing = await this.prisma.admin.findUnique({
        where: { username: dto.username },
      });

      if (existing) {
        throw new BadRequestException('Username already exists');
      }
    }

    let hashedPassword: string | undefined;

    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.admin.update({
      where: { id },
      data: {
        ...(dto.username !== undefined ? { username: dto.username } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(hashedPassword ? { password: hashedPassword } : {}),
      },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async remove(id: number) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
    });

    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    await this.prisma.admin.delete({
      where: { id },
    });

    return {
      message: 'Admin deleted successfully',
    };
  }
}
