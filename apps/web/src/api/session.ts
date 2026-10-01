import { CASHIER_DEFAULTS, PermissionMap, normalizePermissions } from '@farmaplus/domain';

export type Role = 'ADMIN' | 'CASHIER';

export type AuthUser = {
  id: number;
  username: string;
  role: Role;
  code: string;
  permissions: PermissionMap;
};

const TOKEN_KEY = 'farmaplus.token';
const USER_KEY = 'farmaplus.user';
const SESSION_EVENT = 'farmaplus-session';

function emitSession() {
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function onSessionChange(listener: () => void) {
  window.addEventListener(SESSION_EVENT, listener);
  return () => window.removeEventListener(SESSION_EVENT, listener);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  const user = JSON.parse(raw) as AuthUser;
  return {
    ...user,
    role: user.role === 'ADMIN' ? 'ADMIN' : 'CASHIER',
    permissions: normalizePermissions(user.role, user.permissions ?? CASHIER_DEFAULTS),
  };
}

export function setSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({
    ...user,
    permissions: normalizePermissions(user.role, user.permissions),
  }));
  emitSession();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  emitSession();
}
