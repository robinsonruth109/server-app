import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { SetWithdrawalPasswordDto } from './dto/set-withdrawal-password.dto';
import { SaveClientWalletDto } from './dto/save-client-wallet.dto';

@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  // ================= CLIENT WITHDRAW WALLET =================
  // IMPORTANT: keep specific routes before generic :id routes

  @Get('client')
  getClientWallet(@Req() req: any) {
    return this.walletsService.getClientWallet(req.user.userId);
  }

  @Post('set-password')
  setWithdrawalPassword(
    @Req() req: any,
    @Body() dto: SetWithdrawalPasswordDto,
  ) {
    return this.walletsService.setWithdrawalPassword(req.user.userId, dto);
  }

  @Post('client')
  saveClientWallet(@Req() req: any, @Body() dto: SaveClientWalletDto) {
    return this.walletsService.saveClientWallet(req.user.userId, dto);
  }

  // ================= ADMIN COMPANY WALLETS =================

  @Post()
  create(@Body() createWalletDto: CreateWalletDto) {
    return this.walletsService.create(createWalletDto);
  }

  @Get()
  findAll() {
    return this.walletsService.findAll();
  }

  // Old explicit company route
  @Get('company/:id')
  findOneCompanyWallet(@Param('id', ParseIntPipe) id: number) {
    return this.walletsService.findOne(id);
  }

  // Frontend-friendly generic route
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.walletsService.findOne(id);
  }

  // Old explicit company route
  @Patch('company/:id')
  updateCompanyWallet(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWalletDto: UpdateWalletDto,
  ) {
    return this.walletsService.update(id, updateWalletDto);
  }

  // Frontend-friendly generic route
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWalletDto: UpdateWalletDto,
  ) {
    return this.walletsService.update(id, updateWalletDto);
  }

  // Old explicit company route
  @Delete('company/:id')
  removeCompanyWallet(@Param('id', ParseIntPipe) id: number) {
    return this.walletsService.remove(id);
  }

  // Frontend-friendly generic route
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.walletsService.remove(id);
  }
}
