import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { UpdateWithdrawalStatusDto } from './dto/update-withdrawal-status.dto';

@UseGuards(JwtAuthGuard)
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post()
  create(@Body() createWithdrawalDto: CreateWithdrawalDto) {
    return this.withdrawalsService.create(createWithdrawalDto);
  }

  @Get()
  findAll() {
    return this.withdrawalsService.findAll();
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWithdrawalStatusDto,
  ) {
    return this.withdrawalsService.updateStatus(id, dto);
  }
}
