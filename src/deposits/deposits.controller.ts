import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { UpdateDepositStatusDto } from './dto/update-deposit-status.dto';

@UseGuards(JwtAuthGuard)
@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Post()
  create(@Body() createDepositDto: CreateDepositDto) {
    return this.depositsService.create(createDepositDto);
  }

  @Get()
  findAll() {
    return this.depositsService.findAll();
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepositStatusDto,
  ) {
    return this.depositsService.updateStatus(id, dto);
  }
}
