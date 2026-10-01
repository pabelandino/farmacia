import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { normalizePermissions } from '@farmaplus/domain';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: dto.username, mode: 'insensitive' } },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }
    if (!user.active) {
      throw new UnauthorizedException('Este usuario está deshabilitado');
    }
    const payload = { sub: user.id, username: user.username, role: user.role };
    const permissions = normalizePermissions(user.role, user.permissions);
    return {
      token: this.jwt.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        code: user.code,
        permissions,
      },
    };
  }
}
