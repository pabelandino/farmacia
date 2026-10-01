import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '@farmaplus/domain';

export const PERMISSIONS_META = 'permissions';
export const ADMIN_ONLY_META = 'adminOnly';

export const RequirePermission = (...keys: PermissionKey[]) => SetMetadata(PERMISSIONS_META, keys);
export const AdminOnly = () => SetMetadata(ADMIN_ONLY_META, true);
