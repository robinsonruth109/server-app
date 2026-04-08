import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { ClientsModule } from './clients/clients.module';
import { DepositsModule } from './deposits/deposits.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { WalletsModule } from './wallets/wallets.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AdminModule,
    ClientsModule,
    DepositsModule,
    WithdrawalsModule,
    ProductsModule,
    OrdersModule,
    WalletsModule,
    SettingsModule,
  ],
})
export class AppModule {}
