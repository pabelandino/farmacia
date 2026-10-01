import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CASHIER_DEFAULTS, PERMISSION_KEYS, PermissionMap, normalizePermissions } from '@farmaplus/domain';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UserPermissionsDto } from './dto/user.dto';

type Actor = { role: string; sub: number };

function publicUser(user: { passwordHash?: string; permissions: unknown; role: string; [key: string]: unknown }) {
  const { passwordHash: _ignored, ...rest } = user;
  return {
    ...rest,
    permissions: normalizePermissions(user.role, user.permissions),
  };
}

function storedPermissions(role: string, raw?: UserPermissionsDto): Prisma.InputJsonValue {
  if (role === 'ADMIN') return {};
  const next: PermissionMap = { ...CASHIER_DEFAULTS };
  if (raw) {
    for (const key of PERMISSION_KEYS) {
      if (key in raw && raw[key] !== undefined) next[key] = Boolean(raw[key]);
    }
  }
  return next;
}

function resolvedRole(requested: string | undefined, actor: Actor, fallback: UserRole) {
  if (requested === 'ADMIN') {
    if (actor.role !== 'ADMIN') throw new BadRequestException('Solo un administrador puede asignar ese rol');
    return UserRole.ADMIN;
  }
  if (requested === 'CASHIER') return UserRole.CASHIER;
  return fallback;
}

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.user.findMany({ orderBy: [{ active: 'desc' }, { username: 'asc' }] });
    return rows.map((row) => publicUser(row));
  }

  async create(dto: CreateUserDto, actor: Actor) {
    const username = dto.username.trim();
    if (!username) throw new BadRequestException('El usuario es obligatorio');
    const exists = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
    if (exists) throw new BadRequestException('Ese usuario ya existe');
    const role = resolvedRole(dto.role, actor, UserRole.CASHIER);
    const user = await this.prisma.user.create({
      data: {
        username,
        code: dto.code?.trim() || username,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role,
        permissions: storedPermissions(role, dto.permissions),
      },
    });
    return publicUser(user);
  }

  async update(id: number, dto: UpdateUserDto, actor: Actor) {
    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Usuario no encontrado');
    const role = resolvedRole(dto.role, actor, current.role);
    if (current.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
      const admins = await this.prisma.user.count({ where: { role: UserRole.ADMIN } });
      if (admins <= 1) throw new BadRequestException('Debe quedar al menos un administrador');
    }
    if (dto.password && actor.role !== 'ADMIN') {
      throw new BadRequestException('Solo un administrador puede cambiar la contraseña');
    }
    if (dto.active !== undefined && actor.role !== 'ADMIN') {
      throw new BadRequestException('Solo un administrador puede cambiar el estado del usuario');
    }
    if (dto.active === false) {
      if (actor.sub === current.id) throw new BadRequestException('No puede deshabilitar su propio usuario');
      if (current.role === UserRole.ADMIN) {
        const activeAdmins = await this.prisma.user.count({ where: { role: UserRole.ADMIN, active: true } });
        if (activeAdmins <= 1) throw new BadRequestException('Debe quedar al menos un administrador activo');
      }
    }
    if (dto.username) {
      const username = dto.username.trim();
      const taken = await this.prisma.user.findFirst({
        where: { username: { equals: username, mode: 'insensitive' }, NOT: { id } },
      });
      if (taken) throw new BadRequestException('Ese usuario ya existe');
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.username ? { username: dto.username.trim() } : {}),
        ...(dto.code ? { code: dto.code.trim() } : {}),
        ...(dto.password ? { passwordHash: await bcrypt.hash(dto.password, 10) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        role,
        permissions: storedPermissions(role, dto.permissions ?? (current.permissions as UserPermissionsDto)),
      },
    });
    return publicUser(user);
  }
}
