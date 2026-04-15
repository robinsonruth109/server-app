import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { GrabOrderDto } from './dto/grab-order.dto';
import { SubmitOrderDto } from './dto/submit-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  private getCommissionRate(vipLevel: number, settings: any) {
    if (vipLevel === 1) return settings.vip1Commission;
    if (vipLevel === 2) return settings.vip2Commission;
    if (vipLevel === 3) return settings.vip3Commission;
    return settings.vip1Commission;
  }

  private getPlatformCommissionRate(
    platform: string,
    settings: any,
    vipLevel: number,
  ) {
    const normalized = platform.toLowerCase();

    if (normalized === 'amazon') return 0.04;
    if (normalized === 'alibaba') return 0.08;
    if (normalized === 'aliexpress') return 0.12;

    return this.getCommissionRate(vipLevel, settings);
  }

  private getVipByBalance(balance: number, settings: any) {
    if (balance >= settings.vip3MinBalance) return 3;

    if (
      balance >= settings.vip2MinBalance &&
      balance <= settings.vip2MaxBalance
    ) {
      return 2;
    }

    return 1;
  }

  private generateOrderNo() {
    return `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }

  private parsePositions(value: string): number[] {
    if (!value) return [];
    return value
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((num) => !Number.isNaN(num) && num > 0);
  }

  private getComboConfigByPhase(workPhase: number, settings: any) {
    if (workPhase === 1) {
      return {
        comboCount: settings.phase1ComboCount,
        comboPositions: this.parsePositions(settings.phase1ComboPositions),
      };
    }

    if (workPhase === 2) {
      return {
        comboCount: settings.phase2ComboCount,
        comboPositions: this.parsePositions(settings.phase2ComboPositions),
      };
    }

    return {
      comboCount: settings.phase3ComboCount,
      comboPositions: this.parsePositions(settings.phase3ComboPositions),
    };
  }

  private isSameDay(dateA: Date, dateB: Date) {
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    );
  }

  private async resetDailyTasksIfNeeded(clientId: number) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    const now = new Date();

    // If missing, initialize reset time but do NOT destroy an existing admin-set task count
    if (!client.lastTaskResetAt) {
      return this.prisma.client.update({
        where: { id: clientId },
        data: {
          lastTaskResetAt: now,
        },
      });
    }

    if (!this.isSameDay(client.lastTaskResetAt, now)) {
      return this.prisma.client.update({
        where: { id: clientId },
        data: {
          todayTaskCount: 0,
          lastTaskResetAt: now,
        },
      });
    }

    return client;
  }


  private buildNormalOrderItems(
    products: any[],
    balance: number,
    settings: any,
  ) {
    const selected = products.slice(0, 3);

    let items: {
      productId: number;
      productName: string;
      imageUrl: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }[] = [];

    let total = 0;

    for (const product of selected) {
      const qty = 1;
      const subtotal = Number((product.price * qty).toFixed(2));

      items.push({
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        unitPrice: product.price,
        quantity: qty,
        subtotal,
      });

      total += subtotal;
    }

    total = Number(total.toFixed(2));
    const maxNormalAmount = Number(
      (balance * settings.normalOrderRatio).toFixed(2),
    );

    if (total > maxNormalAmount && items.length > 0) {
      items = [];
      total = 0;

      for (const product of selected) {
        if (total + product.price <= maxNormalAmount) {
          const qty = 1;
          const subtotal = Number((product.price * qty).toFixed(2));

          items.push({
            productId: product.id,
            productName: product.name,
            imageUrl: product.imageUrl,
            unitPrice: product.price,
            quantity: qty,
            subtotal,
          });

          total += subtotal;
        }
      }

      if (items.length === 0 && selected.length > 0) {
        const first = selected[0];
        const cappedSubtotal = Number(
          Math.min(first.price, maxNormalAmount).toFixed(2),
        );

        items.push({
          productId: first.id,
          productName: first.name,
          imageUrl: first.imageUrl,
          unitPrice: cappedSubtotal,
          quantity: 1,
          subtotal: cappedSubtotal,
        });

        total = cappedSubtotal;
      }
    }

    return {
      items,
      orderAmount: Number(total.toFixed(2)),
    };
  }

  private buildComboOrderItems(products: any[], targetAmount: number) {
    const selected = products.slice(0, 3);

    let items: {
      productId: number;
      productName: string;
      imageUrl: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }[] = [];

    let total = 0;

    for (const product of selected) {
      const remainingProducts = 3 - items.length;
      const remainingTarget = Math.max(targetAmount - total, 0);
      const baseTargetPerProduct =
        remainingProducts > 0
          ? remainingTarget / remainingProducts
          : remainingTarget;

      const qty = Math.max(1, Math.floor(baseTargetPerProduct / product.price));
      const subtotal = Number((product.price * qty).toFixed(2));

      items.push({
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        unitPrice: product.price,
        quantity: qty,
        subtotal,
      });

      total += subtotal;
    }

    total = Number(total.toFixed(2));

    if (items.length > 0 && total < targetAmount) {
      const lastIndex = items.length - 1;
      const diff = Number((targetAmount - total).toFixed(2));

      const extraQty = Math.max(
        0,
        Math.ceil(diff / Math.max(items[lastIndex].unitPrice, 1)),
      );

      if (extraQty > 0) {
        items[lastIndex].quantity += extraQty;
        items[lastIndex].subtotal = Number(
          (items[lastIndex].unitPrice * items[lastIndex].quantity).toFixed(2),
        );
      }

      total = Number(
        items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
      );
    }

    return {
      items,
      orderAmount: total,
    };
  }

  private buildExactManualComboItems(products: any[], targetAmount: number) {
    const product = products[0];

    return {
      items: [
        {
          productId: product.id,
          productName: product.name,
          imageUrl: product.imageUrl,
          unitPrice: Number(targetAmount.toFixed(2)),
          quantity: 1,
          subtotal: Number(targetAmount.toFixed(2)),
        },
      ],
      orderAmount: Number(targetAmount.toFixed(2)),
    };
  }

  async getPlatformStats(clientId: number, platform: string) {
    const client = await this.resetDailyTasksIfNeeded(clientId);

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    const todayCompletedOrders = await this.prisma.order.findMany({
      where: {
        clientId,
        platform,
        status: 'complete',
        submittedAt: {
          gte: todayStart,
        },
      },
    });

    const yesterdayCompletedOrders = await this.prisma.order.findMany({
      where: {
        clientId,
        platform,
        status: 'complete',
        submittedAt: {
          gte: yesterdayStart,
          lt: todayStart,
        },
      },
    });

    const currentIncompleteOrder = await this.prisma.order.findFirst({
      where: {
        clientId,
        platform,
        status: 'incomplete',
      },
      orderBy: {
        id: 'desc',
      },
    });

    const todayCommission = Number(
      todayCompletedOrders
        .reduce((sum, order) => sum + order.commission, 0)
        .toFixed(4),
    );

    const yesterdayBuyCommission = Number(
      yesterdayCompletedOrders
        .reduce((sum, order) => sum + order.commission, 0)
        .toFixed(4),
    );

    const cashGapBetweenTasks = currentIncompleteOrder
      ? Number(
          Math.max(currentIncompleteOrder.orderAmount - client.balance, 0).toFixed(4),
        )
      : 0;

    const moneyFrozenInAccounts = currentIncompleteOrder
      ? Number(currentIncompleteOrder.orderAmount.toFixed(4))
      : 0;

    return {
      todayTimes: client.todayTaskCount,
      todayCommission,
      cashGapBetweenTasks,
      yesterdayBuyCommission,
      yesterdayTeamCommission: 0,
      moneyFrozenInAccounts,
    };
  }

  async grabOrder(dto: GrabOrderDto) {
    const settings = await this.settingsService.getSettings();

    const client = await this.resetDailyTasksIfNeeded(dto.clientId);

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    if (!client.isApproved) {
      throw new BadRequestException('Client is not approved for work');
    }

    if (client.isFrozen) {
      throw new BadRequestException('Client account is frozen');
    }

    if (!client.canGrabOrders) {
      throw new BadRequestException(
        'Please contact customer care to activate order grabbing permission.',
      );
    }

    if (client.todayTaskCount >= settings.dailyTaskLimit) {
      throw new BadRequestException('Daily task limit reached');
    }

    const existingIncomplete = await this.prisma.order.findFirst({
      where: {
        clientId: dto.clientId,
        status: 'incomplete',
      },
      include: {
        items: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    if (existingIncomplete) {
      return existingIncomplete;
    }

    const vipLevel = this.getVipByBalance(client.balance, settings);

    const products = await this.prisma.product.findMany({
      where: {
        platform: dto.platform,
        vipLevel,
        isActive: true,
      },
      orderBy: { id: 'desc' },
      take: 20,
    });

    if (!products.length) {
      throw new BadRequestException(
        'No products available for this platform/VIP',
      );
    }

    const currentTaskNo = client.todayTaskCount + 1;

    let selectedProducts: {
      productId: number;
      productName: string;
      imageUrl: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }[] = [];

    let orderAmount = 0;
    let orderType: 'normal' | 'combo' = 'normal';
    let commissionRate = this.getCommissionRate(vipLevel, settings);

    if (client.isManualTaskControl) {
      const manualControl = await this.prisma.clientTaskControl.findUnique({
        where: {
          clientId_taskNo: {
            clientId: client.id,
            taskNo: currentTaskNo,
          },
        },
      });

      if (manualControl?.taskAmount && manualControl.taskAmount > 0) {
        const manualBuild = this.buildExactManualComboItems(
          products,
          manualControl.taskAmount,
        );

        selectedProducts = manualBuild.items;
        orderAmount = manualBuild.orderAmount;
        orderType = 'combo';

        commissionRate =
          manualControl.commission && manualControl.commission > 0
            ? manualControl.commission / 100
            : this.getPlatformCommissionRate(dto.platform, settings, vipLevel);
      } else {
        const normalBuild = this.buildNormalOrderItems(
          products,
          client.balance,
          settings,
        );

        selectedProducts = normalBuild.items;
        orderAmount = normalBuild.orderAmount;
        orderType = 'normal';
        commissionRate = this.getPlatformCommissionRate(
          dto.platform,
          settings,
          vipLevel,
        );
      }
    } else {
      const defaultCommissionRate = this.getCommissionRate(vipLevel, settings);
      const { comboCount, comboPositions } = this.getComboConfigByPhase(
        client.workPhase,
        settings,
      );

      const isCombo = comboCount > 0 && comboPositions.includes(currentTaskNo);

      if (isCombo) {
        const targetAmount = Number(
          (client.balance + settings.comboExtraAmount).toFixed(2),
        );

        const comboBuild = this.buildComboOrderItems(products, targetAmount);
        selectedProducts = comboBuild.items;
        orderAmount = comboBuild.orderAmount;
        orderType = 'combo';
        commissionRate = defaultCommissionRate;
      } else {
        const normalBuild = this.buildNormalOrderItems(
          products,
          client.balance,
          settings,
        );
        selectedProducts = normalBuild.items;
        orderAmount = normalBuild.orderAmount;
        orderType = 'normal';
        commissionRate = defaultCommissionRate;
      }
    }

    if (!selectedProducts.length || orderAmount <= 0) {
      throw new BadRequestException('Unable to generate order');
    }

    orderAmount = Number(orderAmount.toFixed(2));
    const commission = Number((orderAmount * commissionRate).toFixed(4));
    const expectedIncome = Number((orderAmount + commission).toFixed(4));

    const order = await this.prisma.order.create({
      data: {
        clientId: client.id,
        orderNo: this.generateOrderNo(),
        orderType,
        status: 'incomplete',
        platform: dto.platform,
        vipLevel,
        orderAmount,
        commission,
        expectedIncome,
        items: {
          create: selectedProducts,
        },
      },
      include: {
        items: true,
      },
    });

    return order;
  }

  async submitOrder(dto: SubmitOrderDto) {
    const settings = await this.settingsService.getSettings();

    const client = await this.resetDailyTasksIfNeeded(dto.clientId);

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order || order.clientId !== dto.clientId) {
      throw new BadRequestException('Order not found');
    }

    if (order.status === 'complete') {
      throw new BadRequestException('Order already completed');
    }

    if (client.balance < order.orderAmount) {
      const missing = Number((order.orderAmount - client.balance).toFixed(4));
      throw new BadRequestException(
        `Your account balance is not enough, you need to recharge ${missing} to submit this order.`,
      );
    }

    const newBalance = Number((client.balance + order.commission).toFixed(4));

    await this.prisma.client.update({
      where: { id: client.id },
      data: {
        balance: newBalance,
        todayTaskCount: {
          increment: 1,
        },
        vipLevel: this.getVipByBalance(newBalance, settings),
      },
    });

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'complete',
        submittedAt: new Date(),
      },
      include: {
        items: true,
      },
    });
  }

  async getRecords(clientId: number, status: 'incomplete' | 'complete') {
    await this.resetDailyTasksIfNeeded(clientId);

    return this.prisma.order.findMany({
      where: {
        clientId,
        status,
      },
      orderBy: { id: 'desc' },
      include: {
        items: true,
      },
    });
  }
}
