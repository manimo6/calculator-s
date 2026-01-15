export const ROUTES = {
  login: '/login',
  admin: '/sehan',
  calculator: '/',
  changePassword: '/change-password',
};

const CALCULATOR_ROLES = new Set(['master', 'admin', 'parttime']);
const ADMIN_ROLES = new Set(['master', 'admin', 'teacher', 'parttime']);

export function canAccessCalculator(user) {
  return Boolean(user && CALCULATOR_ROLES.has(user.role));
}

export function canAccessAdmin(user) {
  return Boolean(user && ADMIN_ROLES.has(user.role));
}

export function isAdminPath(pathname) {
  return pathname === ROUTES.admin || pathname.startsWith(`${ROUTES.admin}/`);
}

export function isAllowedPath(user, pathname) {
  if (!user) return false;
  if (isAdminPath(pathname)) return canAccessAdmin(user);
  if (pathname === ROUTES.calculator) return canAccessCalculator(user);
  if (pathname === ROUTES.changePassword) return true;
  return true;
}

export function getDefaultRoute(user) {
  if (!user) return ROUTES.login;
  if (user.mustChangePassword) return ROUTES.changePassword;
  return canAccessCalculator(user) ? ROUTES.calculator : ROUTES.admin;
}

export function resolvePostLoginRedirect(user, fromPath) {
  if (user?.mustChangePassword) {
    return ROUTES.changePassword;
  }
  if (fromPath && fromPath !== ROUTES.login && isAllowedPath(user, fromPath)) {
    return fromPath;
  }
  return getDefaultRoute(user);
}
