import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasAnyPermission, PermissionKey, PermissionMap } from '@farmaplus/domain';
import { ADMIN_ONLY_META, PERMISSIONS_META } from './permissions.decorator';

export type RequestUser = {
  sub: number;
  username: string;
  role: string;
  permissions: PermissionMap;
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(@Optional() @Inject(Reflector) reflector?: Reflector) {
    this.reflector = reflector ?? new Reflector();
  }

  canActivate(context: ExecutionContext) {
    const adminOnly = this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY_META, [
      context.getHandler(),
      context.getClass(),
    ]);
    const keys = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_META, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!adminOnly && !keys?.length) return true;
    const user = context.switchToHttp().getRequest<{ user?: RequestUser }>().user;
    if (!user) throw new ForbiddenException('No tiene permiso para esta opción');
    if (adminOnly && user.role !== 'ADMIN') {
      throw new ForbiddenException('No tiene permiso para esta opción');
    }
    if (keys?.length && !hasAnyPermission(user, keys)) {
      throw new ForbiddenException('No tiene permiso para esta opción');
    }
    return true;
  }
}
