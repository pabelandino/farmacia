import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { normalizePermissions } from '@farmaplus/domain';
import { PrismaService } from '../prisma/prisma.service';

export type JwtPayload = {
  sub: number;
  username: string;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'change-me-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) throw new UnauthorizedException();
    return {
      sub: user.id,
      username: user.username,
      role: user.role,
      permissions: normalizePermissions(user.role, user.permissions),
    };
  }
}
