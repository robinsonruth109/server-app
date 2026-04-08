import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GrabOrderDto } from './dto/grab-order.dto';
  import { SubmitOrderDto } from './dto/submit-order.dto';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('grab')
  grabOrder(@Body() dto: GrabOrderDto) {
    return this.ordersService.grabOrder(dto);
  }

  @Post('submit')
  submitOrder(@Body() dto: SubmitOrderDto) {
    return this.ordersService.submitOrder(dto);
  }

  @Get('records/:clientId')
  getRecords(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Query('status') status: 'incomplete' | 'complete' = 'complete',
  ) {
    return this.ordersService.getRecords(clientId, status);
  }

  @Get('platform-stats/:clientId')
  getPlatformStats(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Query('platform') platform: string,
  ) {
    return this.ordersService.getPlatformStats(clientId, platform);
  }
}
