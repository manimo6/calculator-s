export const ROUTES = {
  login: '/login',
  admin: '/sehan',
  calculator: '/',
  changePassword: '/change-password',
};

const CALCULATOR_ROLES = new Set(['master', 'admin', 'parttime']);
const ADMIN_ROLES = new Set(['master', 'admin', 'teacher', 'parttime']);

export type AuthUser = {
  role?: string;
  mustChangePassword?: boolean;
} & Record<string, unknown>;

export function canAccessCalculator(user: AuthUser | null) {
  return Boolean(user && user.role && CALCULATOR_ROLES.has(user.role));
}

export function canAccessAdmin(user: AuthUser | null) {
  return Boolean(user && user.role && ADMIN_ROLES.has(user.role));
}

export function isAdminPath(pathname: string) {
  return pathname === ROUTES.admin || pathname.startsWith(`${ROUTES.admin}/`);
}

export function isAllowedPath(user: AuthUser | null, pathname: string) {
  if (!user) return false;
  if (isAdminPath(pathname)) return canAccessAdmin(user);
  if (pathname === ROUTES.calculator) return canAccessCalculator(user);
  if (pathname === ROUTES.changePassword) return true;
  return true;
}

export function getDefaultRoute(user: AuthUser | null) {
  if (!user) return ROUTES.login;
  if (user.mustChangePassword) return ROUTES.changePassword;
  return canAccessCalculator(user) ? ROUTES.calculator : ROUTES.admin;
}

export function resolvePostLoginRedirect(user: AuthUser | null, fromPath?: string) {
  if (user?.mustChangePassword) {
    return ROUTES.changePassword;
  }
  if (fromPath && fromPath !== ROUTES.login && isAllowedPath(user, fromPath)) {
    return fromPath;
  }
  return getDefaultRoute(user);
}
