import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { hasAnyPermission, hasPermission, homePath, PermissionKey } from '@farmaplus/domain';
import { getUser } from '../api/session';

export function GuardedRoute({
  permission,
  any,
  children,
}: {
  permission?: PermissionKey;
  any?: PermissionKey[];
  children: ReactNode;
}) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  const allowed = permission
    ? hasPermission(user, permission)
    : hasAnyPermission(user, any ?? []);
  if (!allowed) return <Navigate to={homePath(user)} replace />;
  return children;
}
