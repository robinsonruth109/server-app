import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateManualModeDto } from './dto/update-manual-mode.dto';
import { SaveTaskControlDto } from './dto/save-task-control.dto';
import { UpdateClientAvatarDto } from './dto/update-client-avatar.dto';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.clientsService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Patch(':id/avatar')
  updateAvatar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientAvatarDto,
  ) {
    return this.clientsService.updateAvatar(id, dto.avatarUrl);
  }

  @Patch(':id/manual-mode')
  updateManualMode(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateManualModeDto,
  ) {
    return this.clientsService.updateManualMode(id, dto);
  }

  @Get(':id/task-control')
  getTaskControls(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.getTaskControls(id);
  }

  @Put(':id/task-control')
  saveTaskControls(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveTaskControlDto,
  ) {
    return this.clientsService.saveTaskControls(id, dto);
  }
}
