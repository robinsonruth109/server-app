import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateManualModeDto } from './dto/update-manual-mode.dto';
import { SaveTaskControlDto } from './dto/save-task-control.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateUniqueInvitationCode(): Promise<string> {
    let newInvitationCode = '';
    let isUnique = false;

    while (!isUnique) {
      newInvitationCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();

      const existingCode = await this.prisma.client.findFirst({
        where: { invitationCode: newInvitationCode },
      });

      if (!existingCode) {
        isUnique = true;
      }
    }

    return newInvitationCode;
  }

  async create(createClientDto: CreateClientDto) {
    const existing = await this.prisma.client.findUnique({
      where: { username: createClientDto.username },
    });

    if (existing) {
      throw new BadRequestException('Username already exists');
    }

    if (createClientDto.referredByCode) {
      const inviter = await this.prisma.client.findFirst({
        where: {
          invitationCode: createClientDto.referredByCode,
        },
      });

      if (!inviter) {
        throw new BadRequestException('Invalid referred by code');
      }
    }

    const hashedPassword = await bcrypt.hash(createClientDto.password, 10);
    const newInvitationCode = await this.generateUniqueInvitationCode();

    return this.prisma.client.create({
      data: {
        username: createClientDto.username,
        password: hashedPassword,
        balance: createClientDto.balance ?? 0,
        vipLevel: createClientDto.vipLevel ?? 1,
        isApproved: createClientDto.isApproved ?? false,
        isFrozen: createClientDto.isFrozen ?? false,
        taxControl: createClientDto.taxControl ?? false,
        canGrabOrders: createClientDto.canGrabOrders ?? false,
        dailyTaskLimit: createClientDto.dailyTaskLimit ?? 25,
        workPhase: createClientDto.workPhase ?? 1,
        isManualTaskControl: false,
        referredByCode: createClientDto.referredByCode || null,
        invitationCode: newInvitationCode,
      },
      select: {
        id: true,
        username: true,
        balance: true,
        vipLevel: true,
        isApproved: true,
        isFrozen: true,
        taxControl: true,
        canGrabOrders: true,
        isManualTaskControl: true,
        dailyTaskLimit: true,
        todayTaskCount: true,
        workPhase: true,
        invitationCode: true,
        referredByCode: true,
        createdAt: true,
      },
    });
  }

  async findAll(search?: string) {
    const clients = await this.prisma.client.findMany({
      where: search
        ? {
            username: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {},
      orderBy: { id: 'desc' },
      include: {
        ipLogs: true,
      },
    });

    return clients.map((client) => ({
      id: client.id,
      username: client.username,
      balance: client.balance,
      vipLevel: client.vipLevel,
      isApproved: client.isApproved,
      isFrozen: client.isFrozen,
      taxControl: client.taxControl,
      canGrabOrders: client.canGrabOrders,
      isManualTaskControl: client.isManualTaskControl,
      dailyTaskLimit: client.dailyTaskLimit,
      todayTaskCount: client.todayTaskCount,
      workPhase: client.workPhase,
      invitationCode: client.invitationCode,
      referredByCode: client.referredByCode,
      avatarUrl: client.avatarUrl,
      createdAt: client.createdAt,
      ipCount: client.ipLogs.length,
      ipAddresses: client.ipLogs.map((log) => log.ipAddress),
    }));
  }

  async findOne(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        ipLogs: true,
        deposits: true,
        withdrawals: true,
      },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    const currentOrder = await this.prisma.order.findFirst({
      where: {
        clientId: id,
        status: 'incomplete',
      },
      orderBy: {
        id: 'desc',
      },
      include: {
        items: true,
      },
    });

    const rawTaskControls = await this.prisma.clientTaskControl.findMany({
      where: { clientId: id },
      orderBy: { taskNo: 'asc' },
    });

    const taskControlMap = new Map(
      rawTaskControls.map((row) => [row.taskNo, row]),
    );

    const taskControls = Array.from({ length: 25 }, (_, index) => {
      const taskNo = index + 1;
      const row = taskControlMap.get(taskNo);

      return {
        taskNo,
        taskAmount: row?.taskAmount ?? null,
        commission: row?.commission ?? null,
        action: row?.taskAmount ? 'Combo' : 'Normal Task',
      };
    });

    return {
      id: client.id,
      username: client.username,
      balance: client.balance,
      vipLevel: client.vipLevel,
      isApproved: client.isApproved,
      isFrozen: client.isFrozen,
      taxControl: client.taxControl,
      canGrabOrders: client.canGrabOrders,
      isManualTaskControl: client.isManualTaskControl,
      dailyTaskLimit: client.dailyTaskLimit,
      todayTaskCount: client.todayTaskCount,
      workPhase: client.workPhase,
      invitationCode: client.invitationCode,
      referredByCode: client.referredByCode,
      avatarUrl: client.avatarUrl,
      createdAt: client.createdAt,
      ipCount: client.ipLogs.length,
      ipAddresses: client.ipLogs.map((log) => log.ipAddress),
      deposits: client.deposits,
      withdrawals: client.withdrawals,
      currentOrder: currentOrder
        ? {
            id: currentOrder.id,
            orderNo: currentOrder.orderNo,
            orderType: currentOrder.orderType,
            platform: currentOrder.platform,
            vipLevel: currentOrder.vipLevel,
            orderAmount: currentOrder.orderAmount,
            commission: currentOrder.commission,
            expectedIncome: currentOrder.expectedIncome,
            status: currentOrder.status,
            createdAt: currentOrder.createdAt,
            submittedAt: currentOrder.submittedAt,
            items: currentOrder.items,
          }
        : null,
      taskControls,
    };
  }

  async update(id: number, updateClientDto: UpdateClientDto) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    return this.prisma.client.update({
      where: { id },
      data: updateClientDto,
      select: {
        id: true,
        username: true,
        balance: true,
        vipLevel: true,
        isApproved: true,
        isFrozen: true,
        taxControl: true,
        canGrabOrders: true,
        isManualTaskControl: true,
        dailyTaskLimit: true,
        todayTaskCount: true,
        workPhase: true,
        invitationCode: true,
        referredByCode: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  async updateAvatar(id: number, avatarUrl: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        avatarUrl,
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });
  }

  async updateManualMode(id: number, dto: UpdateManualModeDto) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        isManualTaskControl: dto.isManualTaskControl,
      },
      select: {
        id: true,
        username: true,
        isManualTaskControl: true,
      },
    });
  }

  async getTaskControls(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    const rawTaskControls = await this.prisma.clientTaskControl.findMany({
      where: { clientId: id },
      orderBy: { taskNo: 'asc' },
    });

    const taskControlMap = new Map(
      rawTaskControls.map((row) => [row.taskNo, row]),
    );

    return Array.from({ length: 25 }, (_, index) => {
      const taskNo = index + 1;
      const row = taskControlMap.get(taskNo);

      return {
        taskNo,
        taskAmount: row?.taskAmount ?? null,
        commission: row?.commission ?? null,
        action: row?.taskAmount ? 'Combo' : 'Normal Task',
      };
    });
  }

  async saveTaskControls(id: number, dto: SaveTaskControlDto) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    const inputMap = new Map(dto.tasks.map((row) => [row.taskNo, row]));

    await this.prisma.$transaction(async (tx) => {
      for (let taskNo = 1; taskNo <= 25; taskNo++) {
        const row = inputMap.get(taskNo);

        const taskAmount =
          row?.taskAmount !== undefined && row?.taskAmount !== null
            ? Number(row.taskAmount)
            : null;

        const commission =
          row?.commission !== undefined && row?.commission !== null
            ? Number(row.commission)
            : null;

        const hasMeaningfulData =
          (taskAmount !== null && !Number.isNaN(taskAmount) && taskAmount > 0) ||
          (commission !== null && !Number.isNaN(commission) && commission > 0);

        if (!hasMeaningfulData) {
          await tx.clientTaskControl.deleteMany({
            where: {
              clientId: id,
              taskNo,
            },
          });
          continue;
        }

        await tx.clientTaskControl.upsert({
          where: {
            clientId_taskNo: {
              clientId: id,
              taskNo,
            },
          },
          update: {
            taskAmount,
            commission,
          },
          create: {
            clientId: id,
            taskNo,
            taskAmount,
            commission,
          },
        });
      }
    });

    return this.getTaskControls(id);
  }

  async deleteClient(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    return this.prisma.client.delete({
      where: { id },
    });
  }
}
