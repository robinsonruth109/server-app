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
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  findAll() {
    return this.adminService.findAll();
  }

  @Post('users')
  create(@Body() dto: CreateAdminDto) {
    return this.adminService.create(dto);
  }

  @Patch('users/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdminDto) {
    return this.adminService.update(id, dto);
  }

  @Delete('users/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.remove(id);
  }
}
