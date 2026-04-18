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

  private getAllowedPlatformByVip(vipLevel: number) {
    if (vipLevel === 1) return 'Amazon';
    if (vipLevel === 2) return 'Alibaba';
    return 'Aliexpress';
  }

  private getAllowedBalanceTextByVip(vipLevel: number, settings: any) {
    if (vipLevel === 1) {
      return `${settings.vip1MinBalance} to ${settings.vip1MaxBalance} USDT`;
    }

    if (vipLevel === 2) {
      return `${settings.vip2MinBalance} to ${settings.vip2MaxBalance} USDT`;
    }

    return `${settings.vip3MinBalance} USDT and above`;
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

  private shuffleArray<T>(items: T[]): T[] {
    const array = [...items];

    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  }

  private async resetDailyTasksIfNeeded(clientId: number) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    // Do not auto-reset todayTaskCount anymore.
    // Only ensure lastTaskResetAt exists.
    if (!client.lastTaskResetAt) {
      return this.prisma.client.update({
        where: { id: clientId },
        data: {
          lastTaskResetAt: new Date(),
        },
      });
    }

    return client;
  }

  private buildNormalOrderItems(products: any[], balance: number) {
    const targetAmount = Number((balance * 0.8).toFixed(2));
    const selected = products.slice(0, Math.min(3, products.length));

    let items: {
      productId: number;
      productName: string;
      imageUrl: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }[] = [];

    let total = 0;

    for (let index = 0; index < selected.length; index++) {
      const product = selected[index];
      const remaining = Number((targetAmount - total).toFixed(2));

      if (remaining <= 0) break;

      const remainingSlots = selected.length - index;
      const targetForThisItem =
        remainingSlots === 1
          ? remaining
          : Number((remaining / remainingSlots).toFixed(2));

      let qty = Math.max(1, Math.floor(targetForThisItem / product.price));
      let subtotal = Number((product.price * qty).toFixed(2));

      while (subtotal > remaining && qty > 1) {
        qty -= 1;
        subtotal = Number((product.price * qty).toFixed(2));
      }

      if (subtotal <= 0) {
        continue;
      }

      items.push({
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        unitPrice: product.price,
        quantity: qty,
        subtotal,
      });

      total = Number((total + subtotal).toFixed(2));
    }

    if (items.length > 0) {
      const lastIndex = items.length - 1;
      const remaining = Number((targetAmount - total).toFixed(2));

      if (remaining >= items[lastIndex].unitPrice) {
        const extraQty = Math.floor(remaining / items[lastIndex].unitPrice);

        if (extraQty > 0) {
          items[lastIndex].quantity += extraQty;
          items[lastIndex].subtotal = Number(
            (
              items[lastIndex].unitPrice * items[lastIndex].quantity
            ).toFixed(2),
          );

          total = Number(
            items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
          );
        }
      }
    }

    return {
      items,
      orderAmount: Number(total.toFixed(2)),
    };
  }

  private buildComboOrderItems(products: any[], targetAmount: number) {
    const selected = products.slice(0, Math.min(3, products.length));

    let items: {
      productId: number;
      productName: string;
      imageUrl: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }[] = [];

    let total = 0;

    for (let index = 0; index < selected.length; index++) {
      const product = selected[index];
      const remaining = Number((targetAmount - total).toFixed(2));

      if (remaining <= 0) break;

      const remainingSlots = selected.length - index;
      const targetForThisItem =
        remainingSlots === 1
          ? remaining
          : Number((remaining / remainingSlots).toFixed(2));

      let qty = Math.max(1, Math.floor(targetForThisItem / product.price));
      let subtotal = Number((product.price * qty).toFixed(2));

      while (subtotal > remaining && qty > 1) {
        qty -= 1;
        subtotal = Number((product.price * qty).toFixed(2));
      }

      if (subtotal <= 0) continue;

      items.push({
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        unitPrice: product.price,
        quantity: qty,
        subtotal,
      });

      total = Number((total + subtotal).toFixed(2));
    }

    if (items.length > 0) {
      let remaining = Number((targetAmount - total).toFixed(2));

      // try to increase quantities to get closer to target
      for (let i = 0; i < items.length && remaining > 0; i++) {
        const item = items[i];
        const extraQty = Math.floor(remaining / item.unitPrice);

        if (extraQty > 0) {
          item.quantity += extraQty;
          item.subtotal = Number((item.unitPrice * item.quantity).toFixed(2));
          total = Number(
            items.reduce((sum, row) => sum + row.subtotal, 0).toFixed(2),
          );
          remaining = Number((targetAmount - total).toFixed(2));
        }
      }
    }

    total = Number(items.reduce((sum, row) => sum + row.subtotal, 0).toFixed(2));

    return {
      items,
      orderAmount: total,
    };
  }

  private buildExactManualComboItems(products: any[], targetAmount: number) {
    const selected = products.slice(0, Math.min(3, products.length));

    let items: {
      productId: number;
      productName: string;
      imageUrl: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }[] = [];

    let total = 0;

    for (let index = 0; index < selected.length; index++) {
      const product = selected[index];
      const remaining = Number((targetAmount - total).toFixed(2));

      if (remaining <= 0) break;

      const remainingSlots = selected.length - index;
      const targetForThisItem =
        remainingSlots === 1
          ? remaining
          : Number((remaining / remainingSlots).toFixed(2));

      let qty = Math.max(1, Math.floor(targetForThisItem / product.price));
      let subtotal = Number((product.price * qty).toFixed(2));

      while (subtotal > remaining && qty > 1) {
        qty -= 1;
        subtotal = Number((product.price * qty).toFixed(2));
      }

      if (subtotal <= 0) continue;

      items.push({
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        unitPrice: product.price,
        quantity: qty,
        subtotal,
      });

      total = Number((total + subtotal).toFixed(2));
    }

    if (items.length === 0 && selected.length > 0) {
      const first = selected[0];

      items.push({
        productId: first.id,
        productName: first.name,
        imageUrl: first.imageUrl,
        unitPrice: first.price,
        quantity: 1,
        subtotal: Number(first.price.toFixed(2)),
      });

      total = Number(first.price.toFixed(2));
    }

    let remaining = Number((targetAmount - total).toFixed(2));

    // Greedy increase across all selected items until near target
    if (items.length > 0 && remaining > 0) {
      let changed = true;

      while (remaining > 0 && changed) {
        changed = false;

        for (let i = 0; i < items.length; i++) {
          if (items[i].unitPrice <= remaining) {
            items[i].quantity += 1;
            items[i].subtotal = Number(
              (items[i].unitPrice * items[i].quantity).toFixed(2),
            );
            total = Number(
              items.reduce((sum, row) => sum + row.subtotal, 0).toFixed(2),
            );
            remaining = Number((targetAmount - total).toFixed(2));
            changed = true;
          }
        }
      }
    }

    total = Number(items.reduce((sum, row) => sum + row.subtotal, 0).toFixed(2));

    return {
      items,
      orderAmount: total,
    };
  }

  async getPlatformStats(clientId: number, platform: string) {
    const client = await this.resetDailyTasksIfNeeded(clientId);

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const yesterdayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
    );

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
          Math.max(
            currentIncompleteOrder.orderAmount - client.balance,
            0,
          ).toFixed(4),
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

    if (client.todayTaskCount >= client.dailyTaskLimit) {
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
    const allowedPlatform = this.getAllowedPlatformByVip(vipLevel);

    if (dto.platform.toLowerCase() !== allowedPlatform.toLowerCase()) {
      throw new BadRequestException(
        `You can't grab orders with ${dto.platform} because your balance is ${client.balance}. ${allowedPlatform} is allowed for balances ${this.getAllowedBalanceTextByVip(vipLevel, settings)}.`,
      );
    }

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

    const randomizedProducts = this.shuffleArray(products);
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
          randomizedProducts,
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
          randomizedProducts,
          client.balance,
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

        const comboBuild = this.buildComboOrderItems(
          randomizedProducts,
          targetAmount,
        );
        selectedProducts = comboBuild.items;
        orderAmount = comboBuild.orderAmount;
        orderType = 'combo';
        commissionRate = defaultCommissionRate;
      } else {
        const normalBuild = this.buildNormalOrderItems(
          randomizedProducts,
          client.balance,
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
        lastTaskResetAt: new Date(),
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
