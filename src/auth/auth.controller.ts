import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ADMIN LOGIN
  @Post('admin-login')
  adminLogin(@Body() loginDto: LoginDto) {
    return this.authService.adminLogin(loginDto);
  }

  // CLIENT REGISTER
  @Post('client-register')
  clientRegister(@Body() dto: RegisterClientDto) {
    return this.authService.clientRegister(dto);
  }

  // CLIENT LOGIN
  @Post('client-login')
  clientLogin(@Body() loginDto: LoginDto) {
    return this.authService.clientLogin(loginDto);
  }

  // GET CURRENT CLIENT
  @UseGuards(JwtAuthGuard)
  @Get('client-me')
  clientMe(@Req() req: any) {
    return this.authService.clientMe(req.user.userId);
  }
}
