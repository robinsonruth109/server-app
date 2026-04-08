import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminService } from '../admin/admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterClientDto } from './dto/register-client.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminService: AdminService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async generateUniqueInvitationCode(): Promise<string> {
    let newInvitationCode = '';
    let isUnique = false;

    while (!isUnique) {
      newInvitationCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();

      const existingCode = await this.prisma.client.findFirst({
        where: { invitationCode: newInvitationCode },
      });

      if (!existingCode) {
        isUnique = true;
      }
    }

    return newInvitationCode;
  }

  private async ensureClientInvitationCode(clientId: number) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new UnauthorizedException();
    }

    if (client.invitationCode) {
      return client;
    }

    const invitationCode = await this.generateUniqueInvitationCode();

    return this.prisma.client.update({
      where: { id: clientId },
      data: {
        invitationCode,
      },
    });
  }

  async adminLogin(loginDto: LoginDto) {
    const admin = await this.adminService.findByUsername(loginDto.username);

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      admin.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: admin.id,
      username: admin.username,
      role: admin.role,
      type: 'admin',
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    };
  }

  async clientRegister(dto: RegisterClientDto) {
    const existing = await this.prisma.client.findUnique({
      where: { username: dto.username },
    });

    if (existing) {
      throw new BadRequestException('Username already exists');
    }

    const inviter = await this.prisma.client.findFirst({
      where: {
        invitationCode: dto.invitationCode,
      },
    });

    if (!inviter) {
      throw new BadRequestException('Invalid invitation code');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const newInvitationCode = await this.generateUniqueInvitationCode();

    const client = await this.prisma.client.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        invitationCode: newInvitationCode,
        referredByCode: dto.invitationCode,
      },
    });

    const payload = {
      sub: client.id,
      username: client.username,
      type: 'client',
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      client: {
        id: client.id,
        username: client.username,
        balance: client.balance,
        vipLevel: client.vipLevel,
        invitationCode: client.invitationCode,
        referredByCode: client.referredByCode,
      },
    };
  }

  async clientLogin(loginDto: LoginDto) {
    const client = await this.prisma.client.findUnique({
      where: { username: loginDto.username },
    });

    if (!client) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (client.isFrozen) {
      throw new UnauthorizedException('Account is frozen');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      client.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ensuredClient = await this.ensureClientInvitationCode(client.id);

    const payload = {
      sub: ensuredClient.id,
      username: ensuredClient.username,
      type: 'client',
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      client: {
        id: ensuredClient.id,
        username: ensuredClient.username,
        balance: ensuredClient.balance,
        vipLevel: ensuredClient.vipLevel,
        invitationCode: ensuredClient.invitationCode,
        referredByCode: ensuredClient.referredByCode,
      },
    };
  }

  async clientMe(clientId: number) {
    const client = await this.ensureClientInvitationCode(clientId);

    return {
      id: client.id,
      username: client.username,
      balance: client.balance,
      vipLevel: client.vipLevel,
      todayTaskCount: client.todayTaskCount,
      dailyTaskLimit: client.dailyTaskLimit,
      invitationCode: client.invitationCode,
      referredByCode: client.referredByCode,
      avatarUrl: client.avatarUrl,
      isApproved: client.isApproved,
      isFrozen: client.isFrozen,
      canGrabOrders: client.canGrabOrders,
    };
  }
}